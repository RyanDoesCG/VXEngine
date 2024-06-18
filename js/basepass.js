class VoxelBasePass 
{
    
}

var basePassVertexShaderSource = 
    `#version 300 es

    precision highp sampler3D;
    precision highp float;
    precision highp int;

    uniform mat4 proj;
    uniform mat4 view;
    uniform mat4 transform;
    uniform float Time;
    uniform vec2 WindowSize;
    uniform int ShouldJitter;
    uniform vec4 CameraPosition;
    uniform sampler2D WhiteNoise;

    in vec3 vertex_position;
    in vec3 vertex_normal;
    in vec2 vertex_uv;

    out vec4 frag_worldpos;
    out vec3 frag_normal;
    out vec2 frag_uv;
    out vec3 frag_raydir;

    float random(vec2 uv)
    {
        return texture(WhiteNoise, uv).r;
    }

    void main() 
    {
        float x = random(vec2(Time, 0.0) * 0.2) * 1.0;
        float y = random(vec2(0.0, Time) * 0.2) * 1.0;

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
    #define SMALL_NUMBER 0.0001

    precision highp sampler3D;
    precision highp float;
    precision highp int;

    in vec4 frag_worldpos;
    in vec3 frag_normal;
    in vec2 frag_uv;
    in vec3 frag_raydir;

    uniform vec2 WindowSize;
    uniform vec4 CameraPosition;
    uniform sampler2D BlueNoise;
    uniform sampler2D TBuffer;
    uniform int ShouldAmbientOcclusion;
    uniform int ShouldJitter;
    uniform float Time;

    uniform sampler3D VoxelTexture;
    uniform vec3      VolumePosition;
    uniform vec3      VolumeSize;
    uniform ivec3     SelectedVoxel;

    layout(location = 0) out vec4 out_color;
    layout(location = 1) out vec4 out_worldpos;
    layout(location = 2) out vec4 out_bloom;

    //
    // on intel processors you can use the += line to increment 
    // the seed on each lookup.
    //
    // on apple M processors, this will _not_ change the value of 
    // s, and if you want different random values within a frame
    // you have to manually seed each of these to not get a random
    // direction where x == y == z
    //
    float s = 0.0;
    float random (float seed)
    {
        vec2 uv = gl_FragCoord.xy / vec2(512.0);
        float tiling = 20.0;
       // s += 0.001;
        float noise = texture(BlueNoise, uv * tiling + vec2(seed)).r;
        return noise;
    }

    float random (float min, float max, float seed)
    {
        return min + random(seed) * abs(max - min);
    }

    vec3 randomDirection()
    {
        float x = random(-1.0, 1.0, 0.124124);
        float y = random(-1.0, 1.0, 1.634553);
        float z = random(-1.0, 1.0, 0.987234);
        return normalize(vec3(x, y, z));
    }


    // VOXEL
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
        float t;  // entry point
        float t2; // exit point
        vec3 position;
        vec3 normal;
        vec3 colour;
        vec2 uv;
        ivec3 id;
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
            
            float u = (
                (HitPositionLocalSpace.x + 0.5) * abs(HitNormal.z + HitNormal.y) + 
                (HitPositionLocalSpace.z + 0.5) * abs(HitNormal.x));
            float v = (    
                (HitPositionLocalSpace.y + 0.5) * abs(HitNormal.z + HitNormal.x) + 
                (HitPositionLocalSpace.z + 0.5) * abs(HitNormal.y));
            vec2 HitUV = vec2(
                u,
                v);

            return Hit (
                mint,
                maxt,
                HitPositionWorldSpace,
                HitNormal,
                box.colour,
                HitUV,
                ivec3(-1));
        }

        return last;
    }

    bool testVoxel(ivec3 uv)
    {
        if (uv.x < 0 || float(uv.x) > (VolumeSize.x - 1.0) ||
            uv.y < 0 || float(uv.y) > (VolumeSize.y - 1.0) ||
            uv.z < 0 || float(uv.z) > (VolumeSize.z - 1.0))
            return false;
    
        return 
            texture(VoxelTexture, vec3(uv.xyz) / VolumeSize.xyz).r > 0.0;
    }

    bool isLight(ivec3 uv)
    {
        return texture(VoxelTexture, vec3(uv.xyz) / VolumeSize.xyz).r < 0.3;
    }

    ivec3 positionToVoxelIndex (vec3 position)
    {
        return ivec3(
            round((VolumeSize.x * 0.5) + (position.x)), 
            round((VolumeSize.y * 0.5) + (position.y)), 
            round((VolumeSize.z * 0.5) + (position.z)));
    }

    vec3 paintVoxel(ivec3 uv)
    {
        if (isLight(uv))
        {
            return vec3(200.0, 200.0, 200.0);
        }
        if (uv.y >= 6)
        {
            return vec3(0.05, 0.05, 0.05);
        }
        return vec3(0.1, 0.1, 0.1);
    }

    float intersectRayPlane(Ray ray, vec3 PlanePosition, vec3 PlaneNormal)
    {
        float d = dot (PlaneNormal, ray.direction);
        if (d < 0.0)
        {
            float t = dot (PlanePosition - ray.origin, PlaneNormal) / d;
            if (t >= 0.0)
                return t;
        }
        return BIG_NUMBER;
    }

    Hit intersectRayVoxel(Ray ray, ivec3 VoxelIndex, float t, vec3 normal)
    {
        Hit VoxelHit;

        VoxelHit.t = t;
        VoxelHit.position = ray.origin + ray.direction * t;
        VoxelHit.normal = normal;       

        vec3 VolumeCorner  = VolumePosition - VolumeSize * 0.5;
        vec3 VoxelPosition = floor(VolumeCorner + vec3(VoxelIndex)) + 0.5;
        vec3 HitPositionLocalSpace = VoxelHit.position - VoxelPosition;

        float u = (
            (HitPositionLocalSpace.x + 0.5) * abs(VoxelHit.normal.z + VoxelHit.normal.y) + 
            (HitPositionLocalSpace.z + 0.5) * abs(VoxelHit.normal.x));
        float v = (    
            (HitPositionLocalSpace.y + 0.5) * abs(VoxelHit.normal.z + VoxelHit.normal.x) + 
            (HitPositionLocalSpace.z + 0.5) * abs(VoxelHit.normal.y));

        VoxelHit.uv = vec2(u, v);

        VoxelHit.colour = paintVoxel(VoxelIndex);
        if (!isLight(VoxelIndex))
        {
            if (VoxelHit.uv.x < 0.025 || VoxelHit.uv.x > 0.975 || VoxelHit.uv.y < 0.025 || VoxelHit.uv.y > 0.975)
            {
                VoxelHit.colour = vec3(0.05);
            }    
        }

        return VoxelHit;
    }

    Hit Miss ()
    {
        Hit miss;
        miss.t = BIG_NUMBER;
        return miss;
    }

    Hit IntersectVoxelsStepping (Ray primary, float t1, float t2, vec3 normal)
    {
        t1 = max(t1, 0.0);

        //////////////////////////////////////////////////////////
        // INITIALIZATION PHASE
        //////////////////////////////////////////////////////////
        // Points in world space at which the ray enters and exits the volume
        // artifacts caused by fp error at t
        vec3  RayStart         = primary.origin + primary.direction * (t1 + 0.0001);
        vec3  RayStop          = primary.origin + primary.direction * (t2 + 0.0001);
        // Convert the world space positions to points in volume-space (3D UVs)
        vec3  EntryVolumeCoord = ((RayStart - VolumePosition) + VolumeSize * 0.5) / (VolumeSize - 1.0);
        vec3  ExitVolumeCoord  = ((RayStop  - VolumePosition) + VolumeSize * 0.5) / (VolumeSize - 1.0);
        // Convert the volume-space coordinates to integer indices to give our entry and exit voxel IDs
        ivec3 EntryVoxel       = ivec3(floor(EntryVolumeCoord * (VolumeSize - 1.0)));
        ivec3 ExitVoxel        = ivec3(floor(ExitVolumeCoord  * (VolumeSize - 1.0)));
        // Where do we go next on each axis?
        ivec3 StepDirection    = ivec3(sign(primary.direction));
        // make a new ray that starts on the volume
        Ray   VolumeRay        = Ray(EntryVolumeCoord * (VolumeSize - 1.0), primary.direction);

        float NextXBoundary = float(EntryVoxel.x);
        if (StepDirection.x > 0) NextXBoundary += 1.0;
        float tMaxX = intersectRayPlane(
            VolumeRay,
            vec3(NextXBoundary, 0.0, 0.0),
            vec3(-StepDirection.x, 0.0, 0.0));

        float NextYBoundary = float(EntryVoxel.y);
        if (StepDirection.y > 0) NextYBoundary += 1.0;
        float tMaxY = intersectRayPlane(
            VolumeRay,
            vec3(0.0, NextYBoundary, 0.0),
            vec3(0.0, -StepDirection.y, 0.0));

        float NextZBoundary = float(EntryVoxel.z);
        if (StepDirection.z > 0) NextZBoundary += 1.0;
        float tMaxZ = intersectRayPlane(
            VolumeRay,
            vec3(0.0, 0.0, NextZBoundary),
            vec3(0.0, 0.0, -StepDirection.z));   

        float tDeltaX = 100000.0;
        if (VolumeRay.direction.x > 0.0)
            tDeltaX = intersectRayPlane(
                VolumeRay,
                vec3(VolumeRay.origin.x + 1.0, 0.0, 0.0),
                vec3(-1.0, 0.0, 0.0));

        if (VolumeRay.direction.x < 0.0)
            tDeltaX = intersectRayPlane(
                VolumeRay,
                vec3(VolumeRay.origin.x - 1.0, 0.0, 0.0),
                vec3(1.0, 0.0, 0.0));

        float tDeltaY = 100000.0;
        if (VolumeRay.direction.y > 0.0)
            tDeltaY = intersectRayPlane(
                VolumeRay,
                vec3(0.0, VolumeRay.origin.y + 1.0, 0.0),
                vec3(0.0, -1.0, 0.0));

        if (VolumeRay.direction.y < 0.0)
            tDeltaY = intersectRayPlane(
                VolumeRay,
                vec3(0.0, VolumeRay.origin.y - 1.0, 0.0),
                vec3(0.0, 1.0, 0.0));

        float tDeltaZ = 100000.0;
        if (VolumeRay.direction.z > 0.0)
            tDeltaZ = intersectRayPlane(
                VolumeRay,
                vec3(0.0, 0.0, VolumeRay.origin.z + 1.0),
                vec3(0.0, 0.0, -1.0));

        if (VolumeRay.direction.z < 0.0)
            tDeltaZ = intersectRayPlane(
                VolumeRay,
                vec3(0.0, 0.0, VolumeRay.origin.z - 1.0),
                vec3(0.0, 0.0, 1.0));

        //////////////////////////////////////////////////////////
        // ITERATION PHASE
        //////////////////////////////////////////////////////////
        ivec3 VoxelIndex = EntryVoxel;
        if (testVoxel(VoxelIndex))
        {
            return intersectRayVoxel(primary, VoxelIndex, t1, normal);
        }

        float scattering = 0.0;
        float t = 0.0;
        while (VoxelIndex != ExitVoxel)
        // int NSteps = 256;
        // for (int i = 0; i < NSteps; ++i)
        {
            ivec3 LastStep;

            if (tMaxX < tMaxY)
            {
                if (tMaxX < tMaxZ)
                {
                    t = tMaxX;
                    VoxelIndex.x += StepDirection.x;
                    tMaxX += tDeltaX;
                    LastStep = ivec3(StepDirection.x,0,0);
                }
                else
                {
                    t = tMaxZ;
                    VoxelIndex.z += StepDirection.z;
                    tMaxZ += tDeltaZ;
                    LastStep = ivec3(0,0,StepDirection.z);
                }
            }
            else
            {
                if (tMaxY < tMaxZ)
                {
                    t = tMaxY;
                    VoxelIndex.y += StepDirection.y;
                    tMaxY += tDeltaY;
                    LastStep = ivec3(0,StepDirection.y,0);
                }
                else 
                {
                    t = tMaxZ;
                    VoxelIndex.z += StepDirection.z;
                    tMaxZ += tDeltaZ;
                    LastStep = ivec3(0,0,StepDirection.z);
                }
            }

            scattering += 0.01;

            // Have we left the grid? exit the loop if so
            if (VoxelIndex.x >= int(VolumeSize.x) || VoxelIndex.x < 0) break;
            if (VoxelIndex.y >= int(VolumeSize.y) || VoxelIndex.y < 0) break;
            if (VoxelIndex.z >= int(VolumeSize.z) || VoxelIndex.z < 0) break;

            // Otherwise, test the voxel we landed in
            if (testVoxel(VoxelIndex))
            {
                Hit hit = intersectRayVoxel(primary, VoxelIndex, t1 + t, vec3(LastStep) * -1.0);
                
             //   hit.colour = mix(vec3(0.2), hit.colour, scattering);
                
                return hit;
            }
        }     


        return Miss();
    }

    Hit IntersectVoxelsLinear (Ray primary, float t1, float t2, int N)
    {
        t1 = max(t1, 0.0);

        float S = 1.0 / float(N);     // size of each step
        float range = t2 - t1; // length of the path through the volume
        vec3 inv = 1.0 / (VolumeSize - 1.0);

        for (int i = 1; i < N; ++i)
        {
            float t = t1 + (range * float(i) * S);      
            vec3  p = primary.origin + primary.direction * t;

            vec3  VolumeCoord = ((p - VolumePosition) + VolumeSize * 0.5) * inv;
            ivec3 VolumeIndex = ivec3(floor(VolumeCoord * (VolumeSize - 1.0)));

            if (testVoxel(VolumeIndex))
            {
                // NEED PROPER NORMAL
                return intersectRayVoxel(primary, VolumeIndex, t, vec3(0.0, 0.0, 0.0));
            }
        }
    
        return Miss();
    }
    // VOXEL


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
        vec3 rayjitter = vec3(0.0);
        //if (ShouldJitter == 1)
        //{
        //    rayjitter = vec3(random(-1.0, 1.0), random(-1.0, 1.0), 0.0) * 0.0001;
        //}

        vec2 screenUV = gl_FragCoord.xy / vec2(WindowSize.xy);

        float t1 = distance(frag_worldpos.xyz, CameraPosition.xyz);
        float t2 = texture(TBuffer, screenUV).r;

        vec3 VolumeMin = VolumePosition + (-VolumeSize * 0.5);
        vec3 VolumeMax = VolumePosition + ( VolumeSize * 0.5);
        if (CameraPosition.x < VolumeMax.x && CameraPosition.x > VolumeMin.x && 
            CameraPosition.y < VolumeMax.y && CameraPosition.y > VolumeMin.y &&
            CameraPosition.z < VolumeMax.z && CameraPosition.z > VolumeMin.z)
        {
            t2 = t1;
            t1 = 0.0;
        }

        Ray primaryRay;
        primaryRay.origin = CameraPosition.xyz;
        primaryRay.direction = normalize(frag_worldpos.xyz - CameraPosition.xyz) + rayjitter;

        Hit primaryHit = IntersectVoxelsStepping(primaryRay, t1, t2, frag_normal.xyz);

        if (primaryHit.t < BIG_NUMBER)
        {
            out_color = vec4(primaryHit.colour, 0.5);

            if (out_color.x > 1.0 || out_color.y > 1.0 || out_color.z > 1.0)
            {
                out_bloom = out_color;
            }

            if (ShouldAmbientOcclusion == 1)
            {
                if (!isLight(primaryHit.id))   
                {
                    {
                        Ray BounceRay;
                        BounceRay.origin = primaryHit.position.xyz + primaryHit.normal.xyz * 0.001;
                        BounceRay.direction = normalize(primaryHit.normal.xyz + randomDirection()).xyz;
                        Hit BounceHit = IntersectVoxelsLinear(BounceRay, 0.0, 2.0, 4);
                        if (BounceHit.t < BIG_NUMBER)
                        {
                            out_color.xyz += BounceHit.colour;
                            if (!isLight(BounceHit.id))
                            {
                                out_color.xyz *= 0.01;
                            }
                            else
                            {
                                out_color.xyz += BounceHit.colour;
                            }
                        }
                    }

                    {
                        Ray BounceRay;
                        BounceRay.origin = primaryHit.position.xyz + primaryHit.normal.xyz * 0.001;
                        BounceRay.direction = normalize(primaryHit.normal.xyz + randomDirection()).xyz;
                        Hit BounceHit = IntersectVoxelsLinear(BounceRay, 4.0, 100.0, 8);
                        if (BounceHit.t < BIG_NUMBER)
                        {
                            out_color.xyz += BounceHit.colour;
                            if (!isLight(BounceHit.id))
                            {
                                out_color.xyz *= 0.01;
                            }
                            else
                            {
                                out_color.xyz += BounceHit.colour;
                            }
                        }
                    }
                }
            }
            
            out_worldpos = vec4(primaryHit.position.xyz, primaryHit.t);
        }
        else
        {
            out_worldpos = vec4(primaryRay.origin + primaryRay.direction * BIG_NUMBER, BIG_NUMBER);
        }

        float gamma = 2.2;
        out_color.rgb = pow(out_color.rgb, vec3(1.0/gamma));

    }`