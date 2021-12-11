// SCREEN QUAD GEOMETRY
var screenGeometryPositions
var screenGeometryUVs
(function()
{
    screenGeometryPositions = new Float32Array([-1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0,  1.0,-1.0, -1.0, 1.0, 1.0])
    screenGeometryUVs = new Float32Array([0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0])
}())

// BOX GEOMETRY
var boxGeometryPositions
var boxGeometryNormals
var boxGeometryUVs
(function()
{
    boxGeometryPositions = new Float32Array([ -0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5, -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,    0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5,  0.5,  0.5, -0.5,  0.5, -0.5, -0.5, -0.5, -0.5, -0.5,  0.5,  0.5,  -0.5, -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5,  -0.5,  0.5,  0.5, -0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  -0.5,  0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5, -0.5, -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  -0.5, -0.5,  0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5 ])
    boxGeometryNormals = new Float32Array([ 0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0, 0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0, 1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0, 1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,-1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0,-1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, 0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0, 0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0, 0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0, 0.0,  1.0,  0.0,  0.0,  1.0,  0.0,  0.0,  1.0,  0.0, 0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0, 0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0 ])
    boxGeometryUVs = new Float32Array([ 0.0, 0.0, 1.0, 1.0, 1.0, 0.0,  0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0,  1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0,  0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0,  0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0,   0.0, 1.0, 0.0, 0.0, 1.0, 1.0 ])
}())

// SPHERE GEOMETRY
var sphereGeometryPositions
var sphereGeometryNormals
var sphereGeometryUVs
(function ()
{
    sphereGeometryPositions = boxGeometryPositions
    sphereGeometryNormals   = boxGeometryNormals
    sphereGeometryUVs       = boxGeometryUVs
    let TesselationLevel = 4;
    for (var t = 0; t < TesselationLevel; ++t)
    {
        var TesselatedBoxPositions = []
        var TesselatedBoxNormals = []
        var TesselatedBoxUVs = []
        for (var i = 0; i < sphereGeometryPositions.length; i += 9)
        {
            A = normalize(vec3(sphereGeometryPositions[i + 0], sphereGeometryPositions[i + 1], sphereGeometryPositions[i + 2]))
            B = normalize(vec3(sphereGeometryPositions[i + 3], sphereGeometryPositions[i + 4], sphereGeometryPositions[i + 5]))
            C = normalize(vec3(sphereGeometryPositions[i + 6], sphereGeometryPositions[i + 7], sphereGeometryPositions[i + 8]))
            D = normalize(lerp(A, B, 0.5))
            E = normalize(lerp(B, C, 0.5))
            F = normalize(lerp(C, A, 0.5))
            TesselatedBoxPositions.push(...A, ...D, ...F, ...D, ...B, ...E, ...E, ...C, ...F, ...F, ...D, ...E);
            TesselatedBoxNormals.push  (...A, ...D, ...F, ...D, ...B, ...E, ...E, ...C, ...F, ...F, ...D, ...E);
        }
        for (var i = 0; i < sphereGeometryUVs.length; i += 6)
        {
            AUV = vec2(sphereGeometryUVs[i + 0], sphereGeometryUVs[i + 1]);
            BUV = vec2(sphereGeometryUVs[i + 2], sphereGeometryUVs[i + 3]);
            CUV = vec2(sphereGeometryUVs[i + 4], sphereGeometryUVs[i + 5]);
            DUV = lerp(AUV, BUV, 0.5);
            EUV = lerp(BUV, CUV, 0.5);
            FUV = lerp(CUV, AUV, 0.5);
            TesselatedBoxUVs.push  (...AUV, ...DUV, ...FUV, ...DUV, ...BUV, ...EUV, ...EUV, ...CUV, ...FUV, ...FUV, ...DUV, ...EUV);
        }
        sphereGeometryPositions = new Float32Array(TesselatedBoxPositions)
        sphereGeometryNormals = new Float32Array(TesselatedBoxNormals)
        sphereGeometryUVs = new Float32Array(TesselatedBoxUVs)   
    }
}())