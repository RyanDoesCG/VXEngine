voxelShaderSource = `
//
//    float random (vec2 st) 
//    {
//        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
//    }    
//
    float randomHash (vec3 st) 
    {
        return fract(sin(dot(st.xyz, vec3(12.9898,78.233,24.23423))) * 43758.5453123);
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

       // return float(uv.y) < 6.0 + sin((float(uv.x) + Time * 0.002) * 2.0 + cos(float(uv.z) + Time * 0.01)) * 2.0; 
      //  float f = texture(PerlinNoise, frag_uvs);
       // return true;
    vec3 point = vec3(0.0, (VolumeSize.y - 1.0) * 0.5, 0.0) + vec3(0.0, VolumeSize.y * 0.5, 0.0);
    return distance(vec3(uv), point) > VolumeSize.y * 0.75;
     //   return uv.y == VolumeSize * 0.5;
       // return uv.x < 3;
       // return uv.x == 0 || uv.y == 0 || uv.z == 0;
     //   return distance(vec3(uv), vec3(VolumeSize * 0.5)) < 0.0;
     //   return float(uv.y) < 12.0 + sin(float(uv.x)) + cos(float(uv.z));
    }

    vec3 paintVoxel(ivec3 uv)
    {
        //if (randomHash(floor(vec3(uv.xyz) * VolumeSize.xyz) + 1.0) < 0.99)
        {
            return vec3(0.1, 0.1, 0.1);
        }

        return vec3(100.0, 0.01,100.0);
    }

    Hit IntersectVoxelsStepping (Ray primary)
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

            // INITIALIZATION PHASE

            // Points in world space at which the ray 
            // enters and exits the volume
            vec3 RayStart = primary.origin + primary.direction * result.t;
            vec3 RayStop  = primary.origin + primary.direction * result.t2;

            // Convert the world space positions to
            // points in volume-space (3D UVs)
            vec3  inv = 1.0 / (VolumeSize - 1.0);
            vec3  StartVolumeCoord  = ((RayStart - VolumePosition) + VolumeSize * 0.5) * inv;
            vec3  StopVolumeCoord   = ((RayStop  - VolumePosition) + VolumeSize * 0.5) * inv;

            // Convert the volume-space coordinates to
            // integer indices
            ivec3 EntryVoxel    = ivec3(floor(StartVolumeCoord * (VolumeSize - 1.0)));
            ivec3 ExitVoxel     = ivec3(floor(StopVolumeCoord  * (VolumeSize - 1.0)));

            // Where do we go next on each axis?
            ivec3 StepDirection = ivec3(sign(primary.direction));
            float nextXBoundary = float(EntryVoxel.x + StepDirection.x);
            float nextYBoundary = float(EntryVoxel.y + StepDirection.y);
            float nextZBoundary = float(EntryVoxel.z + StepDirection.z);
            
            // How far away in units of t is each axis?
           // float tMaxX = (abs(primary.direction.x) > SMALL_NUMBER) ? () / primary.direction.x : BIG_NUMBER;
           // float tMaxY = (abs(primary.direction.y) > SMALL_NUMBER) ? () / primary.direction.y : BIG_NUMBER;
           // float tMaxZ = (abs(primary.direction.z) > SMALL_NUMBER) ? () / primary.direction.z : BIG_NUMBER;

            vec3 VolumeCorner = VolumePosition - VolumeSize * 0.5;
            float tMaxX = (VolumeCorner.x + float(EntryVoxel.x) - RayStart.x) / primary.direction.x;
            float tMaxY = (VolumeCorner.y + float(EntryVoxel.y) - RayStart.y) / primary.direction.y;
            float tMaxZ = (VolumeCorner.z + float(EntryVoxel.z) - RayStart.z) / primary.direction.z;
            
            float tDeltaX = 1.0 / primary.direction.x;
            float tDeltaY = 1.0 / primary.direction.y;
            float tDeltaZ = 1.0 / primary.direction.z;

            // What size step should we take on each axis to cross boundaries?
            // assumes a volume size of 1.0
            //float tDeltaX = (abs(primary.direction.x) > SMALL_NUMBER) ? primary.direction.x * float(StepDirection.x) : BIG_NUMBER;
            //float tDeltaY = (abs(primary.direction.y) > SMALL_NUMBER) ? primary.direction.y * float(StepDirection.y) : BIG_NUMBER;
            //float tDeltaZ = (abs(primary.direction.z) > SMALL_NUMBER) ? primary.direction.z * float(StepDirection.z) : BIG_NUMBER;

            // ITERATION PHASE
            ivec3 VoxelIndex = EntryVoxel;

            if (testVoxel(VoxelIndex))
            {
                Hit hit;
                hit.colour = vec3(VoxelIndex) / (VolumeSize - 1.0);
                return hit;
            }

            Hit miss;
            miss.t = BIG_NUMBER;
            return miss;

            while (VoxelIndex != ExitVoxel)
            {
                if (tMaxX < tMaxY)
                {
                    if (tMaxX < tMaxZ)
                    {
                        VoxelIndex.x += StepDirection.x;
                        if (VoxelIndex.x >= int(VolumeSize.x) || VoxelIndex.x < 0)
                        {
                            break;
                        }
                        tMaxX += tDeltaX;
                    }
                    else
                    {
                        VoxelIndex.z += StepDirection.z;
                        if (VoxelIndex.z >= int(VolumeSize.z) || VoxelIndex.z < 0)
                        {
                            break;
                        }
                        tMaxZ += tDeltaZ;
                    }
                }
                else
                {
                    if (tMaxY < tMaxZ)
                    {
                        VoxelIndex.y += StepDirection.y;
                        if (VoxelIndex.y >= int(VolumeSize.y) || VoxelIndex.y < 0)
                        {
                            break;
                        }
                        tMaxY += tDeltaY;
                    }
                    else 
                    {
                        VoxelIndex.z += StepDirection.z;
                        if (VoxelIndex.z >= int(VolumeSize.z) || VoxelIndex.z < 0)
                        {
                            break;
                        }
                        tMaxZ += tDeltaZ;
                    }
                }

                if (testVoxel(VoxelIndex))
                {
                    Hit hit;
                    hit.colour = vec3(VoxelIndex) / (VolumeSize - 1.0);
                    return hit;
                }

                //Hit miss;
                //miss.t = BIG_NUMBER;
                //return miss;
            }        
        }

        Hit miss;
        miss.t = BIG_NUMBER;
        return miss;
    }

    Hit IntersectVoxelsLinear (Ray primary)
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

            vec3 inv = 1.0 / (VolumeSize - 1.0);

            // march through the volume
            for (int i = 1; i < N; ++i)
            {
                float t = result.t + (range * float(i) * S);      
                vec3  p = primary.origin + primary.direction * t;

                vec3  VolumeCoord = ((p - VolumePosition) + VolumeSize * 0.5) * inv;
                ivec3 VolumeIndex = ivec3(floor(VolumeCoord * (VolumeSize - 1.0)));

                // hit a filled voxel
                if (testVoxel(VolumeIndex))
                {
                    vec3 VolumeCorner = VolumePosition - VolumeSize * 0.5;
                    vec3 VoxelPosition = floor(VolumeCorner + vec3(VolumeIndex)) + 0.5;
                    vec3 VoxelColour = paintVoxel(VolumeIndex);
                    //result.normal = VolumeCoord;
                    //return result;
                    
                    Hit voxelHit;
                    voxelHit.t = BIG_NUMBER;
                    voxelHit = IntersectRayBox(primary, Box(
                            VoxelPosition,
                            VoxelColour,
                            vec3(1.0)), voxelHit);

                    return voxelHit;
                }
            }
        }
        
        Hit miss;
        miss.t = BIG_NUMBER;
        return miss;
    }`