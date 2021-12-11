var basePassVertexShaderSource = 
    `#version 300 es

    precision lowp float;

    #define NUM_VOLUMES 1

    uniform mat4 proj;
    uniform mat4 view;
    uniform mat4 transform;

    uniform float Time;
    uniform vec2 WindowSize;

    uniform int ShouldJitter;

    uniform vec4 CameraPosition;

    in vec3 vertex_position;
    in vec3 vertex_normal;
    in vec2 vertex_uv;

    out vec4 frag_worldpos;
    out vec3 frag_normal;
    out vec2 frag_uv;
    out vec3 frag_raydir;

    float random (vec2 st) 
    {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }    

    void main() 
    {
        float x = random(vec2(Time, 0.0) * 10.0);
        float y = random(vec2(0.0, Time) * 10.0);

        mat4 jitter_proj = proj;
        if (ShouldJitter == 1)
        {
            jitter_proj[2][0] = (x * 2.0 - 1.0) / WindowSize.x;
            jitter_proj[2][1] = (y * 2.0 - 1.0) / WindowSize.y;
        }

        frag_worldpos = transform * vec4(vertex_position, 1.0);
        gl_Position = jitter_proj * view * frag_worldpos;
        frag_normal = (vec4(vertex_normal, 0.0)).xyz;
        frag_uv = vertex_uv;
        frag_raydir = normalize(frag_worldpos.xyz - CameraPosition.xyz);
    }`

var basePassFragmentShaderSource = 
    `#version 300 es

    #define BIG_NUMBER 100000.0

    precision lowp float;

    in vec4 frag_worldpos;
    in vec3 frag_normal;
    in vec2 frag_uv;
    in vec3 frag_raydir;

    uniform vec4 CameraPosition;
    uniform vec3 VolumePosition;
    uniform vec3 VolumeSize;

    layout(location = 0) out vec4 out_color;
    layout(location = 1) out vec4 out_normal;
    layout(location = 2) out vec4 out_uv;

    struct Ray {
        vec3 origin;
        vec3 direction;
    };

    struct Box {
        vec3 position;
        vec3 colour;
        vec3 size;
    };

    struct Sphere {
        vec3 position;
        vec3 colour;
        float size;
    };

    struct Hit {
        float t; // entry point
        float t2; // exit point
        vec3 position;
        vec3 normal;
        vec3 colour;
    };

    Hit IntersectRayBox (Ray ray, Box box, Hit last) 
    {
        box.size *= 0.5;

        vec3 InverseRay = 1.0 / ray.direction; 
        vec3 BoxMin     = box.position - (box.size);
        vec3 BoxMax     = box.position + (box.size);
        float tx1       = (BoxMin.x - ray.origin.x) * InverseRay.x;
        float tx2       = (BoxMax.x - ray.origin.x) * InverseRay.x;
        float mint      = min(tx1, tx2);
        float maxt      = max(tx1, tx2);
        float ty1       = (BoxMin.y - ray.origin.y) * InverseRay.y;
        float ty2       = (BoxMax.y - ray.origin.y) * InverseRay.y;
        mint            = max(mint, min(ty1, ty2));
        maxt            = min(maxt, max(ty1, ty2));
        float tz1       = (BoxMin.z - ray.origin.z) * InverseRay.z;
        float tz2       = (BoxMax.z - ray.origin.z) * InverseRay.z;
        mint            = max(mint, min(tz1, tz2));
        maxt            = min(maxt, max(tz1, tz2));

        if (maxt >= max(0.0, mint) && mint < last.t)
        {
            vec3 HitPositionWorldSpace = ray.origin + ray.direction * mint;
            vec3 HitPositionLocalSpace = HitPositionWorldSpace - box.position;
    
            vec3 HitNormal = vec3(
                (float(abs(HitPositionLocalSpace.x - box.size.x) < 0.00001)) - (float(abs(HitPositionLocalSpace.x - -box.size.x) < 0.00001)), 
                (float(abs(HitPositionLocalSpace.y - box.size.y) < 0.00001)) - (float(abs(HitPositionLocalSpace.y - -box.size.y) < 0.00001)), 
                (float(abs(HitPositionLocalSpace.z - box.size.z) < 0.00001)) - (float(abs(HitPositionLocalSpace.z - -box.size.z) < 0.00001)));
            
            return Hit (
                mint,
                maxt,
                HitPositionWorldSpace,
                HitNormal,
                box.colour);
        }

        return last;
    }

    bool testVoxel(ivec3 uv)
    {
        //return true;
       // vec2 uvs1 = vec2(uv.xz) * 0.01314;
       // vec2 uvs2 = vec2(uv.xz) * 1.0;
       // float miny = //3.314 + 
       //     (texture(PerlinNoise, uvs1).r * 20.231);

       // return float(uv.y) < miny; 

         //   return float(uv.y) < (sin(float(uv.x) * 0.25) + cos(float(uv.z) * 0.25)) * 2.0;
       // return distance(vec3(uv), vec3(0.0,16.0,0.0)) > 20.0;
      //  return uv.y < 0 && uv.x < 0 && uv.z < 0;
     //   return true;
       return uv.x == 0 || uv.y == 0 || uv.z == 0;
      //  return uv.y == 0 && uv.x == 0;
    }

    Hit IntersectVoxels (Ray primary)
    {
        Hit result;
        result.t = BIG_NUMBER;
        result = IntersectRayBox(primary, Box(
            VolumePosition,
            vec3(1.0, 0.0, 1.0),
            VolumeSize), result);
            
        if (result.t < BIG_NUMBER)
        {
            result.t = max(result.t, 0.0);

            const int   N     = 128;            // number of steps to take
            const float S     = 1.0 / float(N); // size of each step
            float range = result.t2 - result.t; // length of the path through the volume

            // march through the volume
            for (int i = 0; i < N; ++i)
            {
                float t = result.t + (range * float(i) * S);      
                vec3  p = primary.origin + primary.direction * t;

                vec3  VolumeCoord = ((p - VolumePosition) + VolumeSize * 0.5) / (VolumeSize - 1.0);
                ivec3 VolumeIndex = ivec3(floor(VolumeCoord * (VolumeSize - 1.0)));

                // hit a filled voxel
                if (testVoxel(VolumeIndex))
                {
                    vec3 VolumeCorner = VolumePosition - VolumeSize * 0.5;
                    vec3 VoxelPosition = VolumeCorner + vec3(VolumeIndex) + 0.5;
                    
                   // result.normal = (vec3(VolumeIndex) / VolumeSize).zzz;
                   // return result;

                    Hit voxelHit;
                    voxelHit.t = BIG_NUMBER;
                    voxelHit = IntersectRayBox(primary, Box(
                            VoxelPosition,
                            vec3(1.0, 0.0, 1.0),
                            vec3(1.0)), voxelHit);

                    return voxelHit;
                }
            }
        }
        
        Hit miss;
        miss.t = BIG_NUMBER;
        return miss;
    }


    float grid (vec3 uv, float Thickness)
    {
        return mix(
            0.0, 
            1.0, 
            float((fract((uv.x ) * 1.0) > Thickness) || 
                (fract((uv.y) * 1.0) > Thickness)));
    }

    float checkerboard(vec2 uv, float thickness)
    {
        uv *= thickness;
        return mod(floor(uv.x) + floor(uv.y), 2.0);
    }

    void main() 
    {        
       // vec4 Result = vec4(1.0, 0.0, 1.0, 1.0);
       vec4 Result = vec4(0.0, 0.0, 0.0, 0.0);

        Ray primaryRay;
        primaryRay.origin = CameraPosition.xyz;
        primaryRay.direction = normalize(frag_worldpos.xyz - CameraPosition.xyz);

        Hit primaryHit = IntersectVoxels(primaryRay);
        if (primaryHit.t < BIG_NUMBER)
        {
            Result = vec4((primaryHit.normal), 1.0);
        }

        //out_color = vec4(frag_raydir, 1.0);
        //return;
        out_color = Result;

        /*
        float f = grid(frag_uv, 0.8);

        out_normal = vec4((frag_normal + 1.0) * 0.5, frag_uv.y);
        out_uv = frag_worldpos;
        */
    }`