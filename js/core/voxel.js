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

