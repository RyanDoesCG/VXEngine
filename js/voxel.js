voxelShaderSource = `
    uniform sampler3D VoxelTexture;

    uniform vec3  VolumePosition;
    uniform vec3  VolumeSize;
    uniform ivec3 SelectedVoxel;

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
            return vec3(200.0, 0.0, 200.0);
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

        if (!isLight(VolumeIndex))
        {
            if (voxelHit.uv.x < 0.025 || voxelHit.uv.x > 0.975 || voxelHit.uv.y < 0.025 || voxelHit.uv.y > 0.975)
            {
                voxelHit.colour = vec3(0.05);
            }
        }

        voxelHit.id = VolumeIndex;


        return voxelHit;
    }

    Hit Miss ()
    {
        Hit miss;
        miss.t = BIG_NUMBER;
        return miss;
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
           // int NSteps = 256;
           // for (int i = 0; i < NSteps; ++i)
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

    Hit IntersectVoxelsLinear (Ray primary, int N)
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

            float S = 1.0 / float(N);     // size of each step
            float range = result.t2 - result.t; // length of the path through the volume
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

function dotProduct (a, b)
{
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function IntersectRayPlane(Position, Normal, RayPosition, RayDirection)
{
    var d = dotProduct (Normal, RayDirection);
    if (d < 0.0)
    {
        var p = [Position[0] - RayPosition[0], Position[1] - RayPosition[1], Position[2] - RayPosition[2]]
        var t = dotProduct (p, Normal) / d;
        if (t >= 0.0)
            return t;
    }
    return 100000.0;
}


function IntersectBoundingBox (Size, Position, RayPosition, RayDirection)
{
    var Extents = [ 0, 0, 0 ]
    Extents[0] = Size[0] * 0.5;
    Extents[1] = Size[1] * 0.5;
    Extents[2] = Size[2] * 0.5;

    var InverseRay = [ 
        1.0 / RayDirection[0], 
        1.0 / RayDirection[1], 
        1.0 / RayDirection[2]];

    var BoxMin     = [ 
        Position[0] - Extents[0], 
        Position[1] - Extents[1],
        Position[2] - Extents[2] ]

    var BoxMax     = [ 
        Position[0] + Extents[0], 
        Position[1] + Extents[1],
        Position[2] + Extents[2] ]

    var tx1       = (BoxMin[0] - RayPosition[0]) * InverseRay[0];
    var tx2       = (BoxMax[0] - RayPosition[0]) * InverseRay[0];

    var mint      = Math.min(tx1, tx2);
    var maxt      = Math.max(tx1, tx2);

    var ty1       = (BoxMin[1] - RayPosition[1]) * InverseRay[1];
    var ty2       = (BoxMax[1] - RayPosition[1]) * InverseRay[1];

    mint            = Math.max(mint, Math.min(ty1, ty2));
    maxt            = Math.min(maxt, Math.max(ty1, ty2));

    var tz1       = (BoxMin[2] - RayPosition[2]) * InverseRay[2];
    var tz2       = (BoxMax[2] - RayPosition[2]) * InverseRay[2];

    mint            = Math.max(mint, Math.min(tz1, tz2));
    maxt            = Math.min(maxt, Math.max(tz1, tz2));

    if (maxt >= Math.max(0.0, mint))
    {
        mint = Math.max(0.0, mint);


        return [
            [RayPosition[0] + RayDirection[0] * mint, RayPosition[1] + RayDirection[1] * mint,RayPosition[2] + RayDirection[2] * mint],
            [RayPosition[0] + RayDirection[0] * maxt, RayPosition[1] + RayDirection[1] * maxt,RayPosition[2] + RayDirection[2] * maxt] 
            ];
    }

    return [];
}

function TestVoxel (VoxelIndex, VolumeData, VolumeSize)
{
    // ASSUMES UNIFORM GRID SIZE
    return VolumeData[
        VoxelIndex[0] + VoxelIndex[1] * VolumeSize[0] + VoxelIndex[2] * VolumeSize[2] * VolumeSize[1]] > 0
}

function IntersectVolume (VolumeSize, VolumePosition, VolumeData, RayPosition, RayDirection)
{
    var BoxIntersection = IntersectBoundingBox(VolumeSize, VolumePosition, RayPosition, RayDirection)

    if (BoxIntersection.length == 2)
    {
        var RayStart = BoxIntersection[0]
        var RayStop = BoxIntersection[1]

        var  EntryVolumeCoord = [
            ((RayStart[0] - VolumePosition[0]) + VolumeSize[0] * 0.5) / (VolumeSize[0] - 1.0),
            ((RayStart[1] - VolumePosition[1]) + VolumeSize[1] * 0.5) / (VolumeSize[1] - 1.0),
            ((RayStart[2] - VolumePosition[2]) + VolumeSize[2] * 0.5) / (VolumeSize[2] - 1.0)];

        var  ExitVolumeCoord = [
            ((RayStop[0] - VolumePosition[0]) + VolumeSize[0] * 0.5) / (VolumeSize[0] - 1.0),
            ((RayStop[1] - VolumePosition[1]) + VolumeSize[1] * 0.5) / (VolumeSize[1] - 1.0),
            ((RayStop[2] - VolumePosition[2]) + VolumeSize[2] * 0.5) / (VolumeSize[2] - 1.0)];

        var EntryVoxel       = [ 
            (Math.floor(EntryVolumeCoord[0] * (VolumeSize[0] - 1.0))),
            (Math.floor(EntryVolumeCoord[1] * (VolumeSize[1] - 1.0))),
            (Math.floor(EntryVolumeCoord[2] * (VolumeSize[2] - 1.0))) ];

        var ExitVoxel       = [ 
            (Math.floor(ExitVolumeCoord[0] * (VolumeSize[0] - 1.0))),
            (Math.floor(ExitVolumeCoord[1] * (VolumeSize[1] - 1.0))),
            (Math.floor(ExitVolumeCoord[2] * (VolumeSize[2] - 1.0))) ];

        var StepDirection    = [
            ((RayDirection[0] >= 0) ? 1.0 : -1.0),
            ((RayDirection[1] >= 0) ? 1.0 : -1.0),
            ((RayDirection[2] >= 0) ? 1.0 : -1.0)];

        var VolumeRayPosition = [ 
            EntryVolumeCoord[0] * (VolumeSize[0] - 1.0),
            EntryVolumeCoord[1] * (VolumeSize[1] - 1.0),
            EntryVolumeCoord[2] * (VolumeSize[2] - 1.0) ]

        var VolumeRayDirection = RayDirection;

        var NextXBoundary = (EntryVoxel[0]);
        if (StepDirection[0] > 0) NextXBoundary += 1.0;
        var tMaxX = IntersectRayPlane(
            [NextXBoundary, 0.0, 0.0],
            [-StepDirection[0], 0.0, 0.0],
            VolumeRayPosition,
            VolumeRayDirection);

        var NextYBoundary = (EntryVoxel[1]);
        if (StepDirection[1] > 0) NextYBoundary += 1.0;
        var tMaxY = IntersectRayPlane(
            [0.0, NextYBoundary,    0.0],
            [0.0,-StepDirection[1], 0.0],
            VolumeRayPosition,
            VolumeRayDirection);

        var NextZBoundary = (EntryVoxel[2]);
        if (StepDirection[2] > 0) NextZBoundary += 1.0;
        var tMaxZ = IntersectRayPlane(
            [0.0, 0.0, NextZBoundary],
            [0.0, 0.0, -StepDirection[2]],
            VolumeRayPosition,
            VolumeRayDirection);

        var tDeltaX = 100000.0;
        if (VolumeRayDirection[0] > 0.0)
            tDeltaX = IntersectRayPlane(
                [VolumeRayPosition[0] + 1.0, 0.0, 0.0],
                [-1.0, 0.0, 0.0],
                VolumeRayPosition,
                VolumeRayDirection);

        if (VolumeRayDirection[0] < 0.0)
            tDeltaX = IntersectRayPlane(
                [VolumeRayPosition[0] - 1.0, 0.0, 0.0],
                [1.0, 0.0, 0.0],
                VolumeRayPosition,
                VolumeRayDirection);

        var tDeltaY = 100000.0;
        if (VolumeRayDirection[1] > 0.0)
            tDeltaY = IntersectRayPlane(
                [0.0, VolumeRayPosition[1] + 1.0, 0.0],
                [0.0, -1.0, 0.0],
                VolumeRayPosition,
                VolumeRayDirection);

        if (VolumeRayDirection[1] < 0.0)
            tDeltaY = IntersectRayPlane(
                [0.0, VolumeRayPosition[1] - 1.0, 0.0],
                [0.0, 1.0, 0.0],
                VolumeRayPosition,
                VolumeRayDirection);

        var tDeltaZ = 100000.0;
        if (VolumeRayDirection[2] > 0.0)
            tDeltaZ = IntersectRayPlane(
                [0.0, 0.0, VolumeRayPosition[2] + 1.0 ],
                [0.0, 0.0, -1.0 ],
                VolumeRayPosition,
                VolumeRayDirection);

        if (VolumeRayDirection[2] < 0.0)
            tDeltaZ = IntersectRayPlane(
                [0.0, 0.0, VolumeRayPosition[2] - 1.0],
                [0.0, 0.0,  1.0 ],
                VolumeRayPosition,
                VolumeRayDirection);

        var VoxelIndex = EntryVoxel;
        if (TestVoxel(VoxelIndex, VolumeData, VolumeSize))
        {
            return VoxelIndex;
        }

        while (VoxelIndex != ExitVoxel)
        {
            if (tMaxX < tMaxY)
            {
                if (tMaxX < tMaxZ)
                {
                    VoxelIndex[0] += StepDirection[0];
                    tMaxX += tDeltaX;
                }
                else
                {
                    VoxelIndex[2] += StepDirection[2];
                    tMaxZ += tDeltaZ;
                }
            }
            else
            {
                if (tMaxY < tMaxZ)
                {
                    VoxelIndex[1] += StepDirection[1];
                    tMaxY += tDeltaY;
                }
                else 
                {
                    VoxelIndex[2] += StepDirection[2];
                    tMaxZ += tDeltaZ;
                }
            }

            // Have we left the grid? exit the loop if so
            if (VoxelIndex[0] >= VolumeSize[0] || VoxelIndex[0] < 0) break;
            if (VoxelIndex[1] >= VolumeSize[1] || VoxelIndex[1] < 0) break;
            if (VoxelIndex[2] >= VolumeSize[2] || VoxelIndex[2] < 0) break;

            // Otherwise, test the voxel we landed in
            if (TestVoxel(VoxelIndex, VolumeData, VolumeSize))
            {
                return VoxelIndex;
            }
        }      
    }

    return [-1, -1, -1];
}

