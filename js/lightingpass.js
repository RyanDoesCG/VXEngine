var LightingPassVertexShaderSource = 
    `#version 300 es

    in vec4 vertex_position;
    in vec2 vertex_uvs;

    uniform mat4  projection;
    uniform mat4  view;

    uniform float near;
    uniform float far;

    out vec3 frag_rayorigin;
    out vec3 frag_raydir;
    out vec2 frag_uvs;

    void main() 
    {
        gl_Position = vertex_position;

        mat4 projview = projection * view;
        mat4 invprojview = inverse(projview);
        vec4 v = vec4(
            vertex_position.x * (far - near), 
            vertex_position.y * (far - near), 
            far + near, 
            far - near);
        frag_rayorigin = (invprojview * vec4(vertex_position.xy, 0.0, 0.0) * near).xyz;
        frag_raydir = normalize((invprojview * v).xyz);
        frag_uvs = vertex_uvs;
    }`

var LightingPassFragmentShaderHeaderSource = 
    `#version 300 es

    #define PI 3.1415926535

    precision lowp float;

    uniform sampler2D AlbedoBuffer;
    uniform sampler2D NormalBuffer;
    uniform sampler2D UVBuffer;

    uniform sampler2D PerlinNoise;
    uniform sampler2D WhiteNoise;
    uniform sampler2D BlueNoise;


    uniform sampler2D WorldTexture;

    uniform float Time;
    uniform vec4 CameraPosition;
    uniform mat4 ViewToWorld;
    uniform mat4 WorldToView;

        uniform int ShouldJitter;
    
    #define NUM_BOXES *MAX_RT_PRIMITIVES*
    uniform int NBoxesThisFrame;
    uniform vec3 BoxPositions[NUM_BOXES];
    uniform vec3 BoxColours[NUM_BOXES];
    uniform vec3 BoxSizes[NUM_BOXES];

    #define NUM_SPHERES 2
    #if NUM_SPHERES > 0
    uniform vec3 SpherePositions[NUM_SPHERES];
    uniform vec3 SphereColours[NUM_SPHERES];
    uniform float SphereSizes[NUM_SPHERES];
    #endif

    uniform int ShadingMode;

    in vec3 frag_rayorigin;
    in vec3 frag_raydir;
    in vec2 frag_uvs;

    out vec4 out_color;

    const float BIG_NUMBER = 10000.0;
`

var LightingPassFragmentShaderFooterSource = `
    float seed = 0.0;
    float randomWS ()
    {
        vec4 WorldPosition = texture(UVBuffer, frag_uvs);
        vec2 uv = vec2(WorldPosition.x + WorldPosition.y, WorldPosition.z + WorldPosition.y);

        seed += 0.01;
        return texture(
            BlueNoise, 
            vec2(sin(Time * 10.0), cos(Time * 10.0)) * 0.01
                + 
            (uv * 12.0) 
                + 
            vec2(seed)).x;
    }

    float random ()
    {
        seed += 0.01;
        return texture(
            BlueNoise, 
            vec2(sin(Time * 10.0), cos(Time * 10.0)) * 0.01
                + 
            (frag_uvs * 12.0) 
                + 
            vec2(seed)).x;
    }

    float random (float min, float max)
    {
        return min + random() * (max - min);
    }

    vec3 randomDirection()
    {
        float x = random(-1.0, 1.0);
        float y = random(-1.0, 1.0);
        float z = random(-1.0, 1.0);

        return normalize(vec3(x, y, z));
    }

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
        vec2 uvs1 = vec2(uv.xz) * 0.01314;
        vec2 uvs2 = vec2(uv.xz) * 1.0;
        float miny = //3.314 + 
            (texture(PerlinNoise, uvs1).r * 20.231);

        return float(uv.y) < miny; 

           // return float(uv.y) < (sin(float(uv.x) * 0.25) + cos(float(uv.z) * 0.25)) * 2.0;
       // return distance(vec3(uv), vec3(0.0,16.0,0.0)) > 20.0;
        return true;
        return uv.x == 0 || uv.y == 0 || uv.z == 0;
    }

    Hit IntersectVoxels (Ray primary)
    {
        Hit hit;
        hit.t = 100000.0;

        float boxSize = 32.0;

        Hit result;
        result.t = BIG_NUMBER;
        result = IntersectRayBox(primary, Box(
            vec3(0.0, 0.0, 0.0),
            vec3(1.0, 0.0, 1.0),
            vec3(boxSize, boxSize, boxSize)), result);
            
        if (result.t < BIG_NUMBER)
        {
            result.t = max(result.t, 0.0);

            const int   N     = 256;            // number of steps to take
            const float S     = 1.0 / float(N); // size of each step
            float       range = result.t2 - result.t; // length of the path through the volume

            // march through the volume
            for (int i = 0; i < N; ++i)
            {
                float t = result.t + (range * float(i) * S); 
                vec3  p = primary.origin + primary.direction * t;
                bool  b = testVoxel(ivec3((p))      );
                
                // hit a filled voxel
                if (b)
                {
                    vec3 n;
                    Hit voxelHit;
                    voxelHit.t = BIG_NUMBER;
                    voxelHit = IntersectRayBox(primary, Box(
                            floor(p) + vec3(0.5),
                            vec3(1.0, 0.0, 1.0),
                            vec3(1.0, 1.0, 1.0)), voxelHit);

                    hit = voxelHit;
                    break;
                }
            }
        }
    
        return hit;
    }

    vec4 raytraced_voxels ()
    {
        vec4 Result = vec4(0.0, 0.0, 0.0, 1.0);

        vec3 rayjitter = vec3(0.0);
        if (ShouldJitter == 1)
        {
            rayjitter = vec3(random(-0.001, 0.001), random(-0.001, 0.001), 0.0);
        }

        Ray primaryRay;
        primaryRay.origin = CameraPosition.xyz;
        primaryRay.direction = normalize(frag_raydir + rayjitter);

        Hit primaryHit = IntersectVoxels(primaryRay);
        if (primaryHit.t < BIG_NUMBER)
        {
            // bounce rays
            Result += vec4(0.2, 0.2, 0.2, 1.0);


            const int N_Samples = 2;
            vec3 s = vec3(0.0);
            for (int i = 0; i < N_Samples; ++i)
            {
                Ray BounceRay = Ray(
                    primaryHit.position.xyz + primaryHit.normal.xyz * 0.01, 
                    normalize(primaryHit.normal.xyz + randomDirection()));

                Hit BounceHit = IntersectVoxels(BounceRay);
                if (BounceHit.t < BIG_NUMBER)
                {
                    s += vec3(0.2, 0.2, 0.2);
                    if (N_Samples > 1)
                    {
                        Result *= vec4(1.0 - (1.0 / float(N_Samples)));
                    }

                }
            }

            Result.xyz += (s / float(N_Samples)) * 0.2;

        }

        return Result;
    }

    void main() 
    {
        vec4 Result;

            Result = raytraced_voxels();
        
        out_color = Result;
        
        float gamma = 2.2;
        out_color.rgb = pow(out_color.rgb, vec3(1.0/gamma));

    }`