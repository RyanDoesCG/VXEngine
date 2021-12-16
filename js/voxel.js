voxelShaderSource = `
    uniform sampler2D PerlinNoise;

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
                HitUV);
        }

        return last;
    }

    bool testVoxel(ivec3 uv)
    {
     //   return uv.y < 3;
  //  return !(uv.x == 0 && uv.y == 0 && uv.z == 0);
       // return float(uv.y) < 6.0 + (sin((float(uv.x) * 0.1) * 2.0 + cos(float(uv.z) * 0.1)) * 2.0) * length(vec3(uv)) * 0.01; 
        float f1 = (-1.0 + texture(PerlinNoise, vec2(uv.xz) * 0.000254).r * 2.0) * 376.0;
        float f2 = (-1.0 + texture(PerlinNoise, vec2(uv.xz) * 0.002).r * 2.0) * 20.0;
        float f3 = (-1.0 + texture(PerlinNoise, vec2(uv.xz) * 1.0).r * 2.0) * 1.0;
        return float(uv.y) < 20.0 + (f1 + f2 + f3);
       // return true;
    //vec3 point = vec3(0.0, (VolumeSize.y - 1.0) * 0.5, 0.0) + vec3(0.0, VolumeSize.y * 0.5, 0.0);
    //return distance(vec3(uv), point) > VolumeSize.y * 0.75;
    // //   return uv.y == VolumeSize * 0.5;
        //return uv.y < 3;
       // return uv.x == 0 || uv.y == 0 || uv.z == 0;
     //   return distance(vec3(uv), vec3(VolumeSize * 0.5)) < 0.0;
     //   return float(uv.y) < 12.0 + sin(float(uv.x)) + cos(float(uv.z));
        //return true;
    }

    vec3 paintVoxel(ivec3 uv)
    {
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

    Hit intersectRayVoxel(Ray ray, ivec3 VolumeIndex)
    {
        vec3 VolumeCorner  = VolumePosition - VolumeSize * 0.5;
        vec3 VoxelPosition = floor(VolumeCorner + vec3(VolumeIndex)) + 0.5;
        vec3 VoxelColour   = paintVoxel(VolumeIndex);
        Hit voxelHit;
        voxelHit.t = BIG_NUMBER;
        voxelHit = IntersectRayBox(ray, Box(
                VoxelPosition,
                VoxelColour,
                vec3(1.0)), voxelHit);

        if (voxelHit.uv.x < 0.025 || voxelHit.uv.x > 0.975 || voxelHit.uv.y < 0.025 || voxelHit.uv.y > 0.975)
        {
            voxelHit.colour = vec3(0.05);
        }
      //  voxelHit.colour = vec3(voxelHit.uv.xy, 1.0);
        return voxelHit;
    }

    Hit Miss ()
    {
        Hit miss;
        miss.t = BIG_NUMBER;
        return miss;
    }

    Hit IntersectVoxelsHybrid(Ray primary)
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
            if (result.t < 10.0)
            {


                //////////////////////////////////////////////////////////
                // INITIALIZATION PHASE
                //////////////////////////////////////////////////////////
                // Points in world space at which the ray enters and exits the volume
                // artifacts caused by fp error at t
                vec3  RayStart         = primary.origin + primary.direction * (result.t  + 0.0001);
                vec3  RayStop          = primary.origin + primary.direction * (result.t2 + 0.0001);
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
                    return intersectRayVoxel(primary, VoxelIndex);
                }

                while (VoxelIndex != ExitVoxel)
                {
                    if (tMaxX < tMaxY)
                    {
                        if (tMaxX < tMaxZ)
                        {
                            VoxelIndex.x += StepDirection.x;
                            tMaxX += tDeltaX;
                        }
                        else
                        {
                            VoxelIndex.z += StepDirection.z;
                            tMaxZ += tDeltaZ;
                        }
                    }
                    else
                    {
                        if (tMaxY < tMaxZ)
                        {
                            VoxelIndex.y += StepDirection.y;
                            tMaxY += tDeltaY;
                        }
                        else 
                        {
                            VoxelIndex.z += StepDirection.z;
                            tMaxZ += tDeltaZ;
                        }
                    }

                    // Have we left the grid? exit the loop if so
                    if (VoxelIndex.x >= int(VolumeSize.x) || VoxelIndex.x < 0) break;
                    if (VoxelIndex.y >= int(VolumeSize.y) || VoxelIndex.y < 0) break;
                    if (VoxelIndex.z >= int(VolumeSize.z) || VoxelIndex.z < 0) break;

                    // Otherwise, test the voxel we landed in
                    if (testVoxel(VoxelIndex))
                    {
                        return intersectRayVoxel(primary, VoxelIndex);
                    }
                }     
            }
            else
            {
                result.t = max(result.t, 0.0);

                const int   N = 128;                  // number of steps to take
                const float S = 1.0 / float(N);       // size of each step
                float   range = result.t2 - result.t; // length of the path through the volume
                vec3 inv = 1.0 / (VolumeSize - 1.0);

                for (int i = 1; i < N; ++i)
                {
                    float t = result.t + (range * float(i) * S);      
                    vec3  p = primary.origin + primary.direction * t;

                    vec3  VolumeCoord = ((p - VolumePosition) + VolumeSize * 0.5) * inv;
                    ivec3 VolumeIndex = ivec3(floor(VolumeCoord * (VolumeSize - 1.0)));

                    if (testVoxel(VolumeIndex))
                    {
                        return intersectRayVoxel(primary, VolumeIndex); 
                    }
                }
            }
        }

        return Miss();
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

            //////////////////////////////////////////////////////////
            // INITIALIZATION PHASE
            //////////////////////////////////////////////////////////
            // Points in world space at which the ray enters and exits the volume
            // artifacts caused by fp error at t
            vec3  RayStart         = primary.origin + primary.direction * (result.t  + 0.0001);
            vec3  RayStop          = primary.origin + primary.direction * (result.t2 + 0.0001);
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
                return intersectRayVoxel(primary, VoxelIndex);
            }

            while (VoxelIndex != ExitVoxel)
            {
                if (tMaxX < tMaxY)
                {
                    if (tMaxX < tMaxZ)
                    {
                        VoxelIndex.x += StepDirection.x;
                        tMaxX += tDeltaX;
                    }
                    else
                    {
                        VoxelIndex.z += StepDirection.z;
                        tMaxZ += tDeltaZ;
                    }
                }
                else
                {
                    if (tMaxY < tMaxZ)
                    {
                        VoxelIndex.y += StepDirection.y;
                        tMaxY += tDeltaY;
                    }
                    else 
                    {
                        VoxelIndex.z += StepDirection.z;
                        tMaxZ += tDeltaZ;
                    }
                }

                // Have we left the grid? exit the loop if so
                if (VoxelIndex.x >= int(VolumeSize.x) || VoxelIndex.x < 0) break;
                if (VoxelIndex.y >= int(VolumeSize.y) || VoxelIndex.y < 0) break;
                if (VoxelIndex.z >= int(VolumeSize.z) || VoxelIndex.z < 0) break;

                // Otherwise, test the voxel we landed in
                if (testVoxel(VoxelIndex))
                {
                    return intersectRayVoxel(primary, VoxelIndex);
                }
            }     
        }  

        return Miss();
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

            const int   N = 128;                  // number of steps to take
            const float S = 1.0 / float(N);       // size of each step
            float   range = result.t2 - result.t; // length of the path through the volume
            vec3 inv = 1.0 / (VolumeSize - 1.0);

            for (int i = 1; i < N; ++i)
            {
                float t = result.t + (range * float(i) * S);      
                vec3  p = primary.origin + primary.direction * t;

                vec3  VolumeCoord = ((p - VolumePosition) + VolumeSize * 0.5) * inv;
                ivec3 VolumeIndex = ivec3(floor(VolumeCoord * (VolumeSize - 1.0)));

                if (testVoxel(VolumeIndex))
                {
                    return intersectRayVoxel(primary, VolumeIndex); 
                }
            }
        }
        
        return Miss();
    }`