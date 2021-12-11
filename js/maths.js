let cos = Math.cos;
let sin = Math.sin;

/////////////////////////////////////////////////
// Vector
/////////////////////////////////////////////////
function vec4  (x, y, z, w) 
{ 
    return new Float32Array([ x, y, z, w ]); 
}

function vec3  (x, y, z) 
{ 
    return new Float32Array([ x, y, z ]); 
}

function vec2 (x, y) 
{ 
    return new Float32Array([ x, y ]); 
}

function dot (lhs, rhs) 
{ 
    if (lhs.length != rhs.length) alert("dot")
    var N = lhs.length
    var R = 0.0
    for (var i = 0; i < N; ++i)
        R += lhs[i] * rhs[i]
    return R; 
}

function addv (lhs, rhs)
{ 
    if (lhs.length != rhs.length)  alert("add")
    var N = lhs.length
    var R = []
    for (var i = 0; i < N; ++i)
        R.push(lhs[i] + rhs[i])
    return R; 
}

function subv (lhs, rhs)
{ 
    if (lhs.length != rhs.length)  alert("sub")
    var N = lhs.length
    var R = []
    for (var i = 0; i < N; ++i)
        R.push(lhs[i] - rhs[i])
    return R; 
}

function multiplys (lhs, rhs)
{ 
    var N = lhs.length
    var R = []
    for (var i = 0; i < N; ++i)
        R.push(lhs[i] * rhs)
    return R; 
}

function divides (lhs, rhs) 
{ 
    var N = lhs.length
    var R = []
    for (var i = 0; i < N; ++i)
        R.push(lhs[i] / rhs)
    return R; 
}

function cross (lhs, rhs)
{ 
    return vec4(lhs[1] * rhs[2] - lhs[2] * rhs[1], lhs[2] * rhs[0] - lhs[0] * rhs[2], lhs[0] * rhs[1] - lhs[1] * rhs[0]) 
}

function len (v)
{ 
    return Math.sqrt(dot(v, v)) 
}

function normalize (v) 
{ 
    return divides(v, len(v))  
}

function lerp (a, b, t)
{
    return addv(a, multiplys(subv(b, a), t))
}

/////////////////////////////////////////////////
// Matrix
/////////////////////////////////////////////////
function identity ()
{
    return new Float32Array([
    //        Column Major Representation
    //          row0  row1  row2  row3
    /* col 0 */ 1.0,  0.0,  0.0,  0.0,
    /* col 1 */ 0.0,  1.0,  0.0,  0.0,
    /* col 2 */ 0.0,  0.0,  1.0,  0.0, 
    /* col 3 */ 0.0,  0.0,  0.0,  1.0]);
}

function matrix (
    // Row Major Representation for Input
    //          col0  col1  col2  col3
    /* row 0 */ a0,   a1,   a2,   a3,
    /* row 1 */ b0,   b1,   b2,   b3,
    /* row 2 */ c0,   c1,   c2,   c3,
    /* row 3 */ d0,   d1,   d2,   d3)
{
    return new Float32Array([
    //        Column Major Representation
    //          row0  row1  row2  row3
    /* col 0 */ a0,  b0,  c0,  d0,
    /* col 1 */ a1,  b1,  c1,  d1,
    /* col 2 */ a2,  b2,  c2,  d2, 
    /* col 3 */ a3,  b3,  c3,  d3]);
}

function access(m, y, x)
{
    return m[(y * 4) + x]
}

function transpose (matrix)
{
    return new Float32Array([
        matrix[0], matrix[4], matrix[8],  matrix[12],
        matrix[1], matrix[5], matrix[9],  matrix[13],
        matrix[2], matrix[6], matrix[10], matrix[14], 
        matrix[3], matrix[7], matrix[11], matrix[15]]);
}

function determinant (matrix)
{
    // ASSUMES SQUARE MATRIX
    // | a   b \
    // |       | = ad - bc
    // | c   d |
    // It is the product of the elements on the main diagonal 
    // minus the product of the elements off the main diagonal
    var md = 0.0
    var omd = 0.0
    for (var y = 0; y < matrix.length; ++y)
        for (var x = 0; x < matrix.length; ++x)
            if (x == y)
                md *= access(matrix, x, y)
            else
                omd *= access(matrix, x, y)

    return md - omd;
}

function inverse (matrix)
{
    return matrix;
}

function multiplym (lhs, rhs)
{
    let column0 = new Float32Array([rhs[0],  rhs[1],  rhs[2],  rhs[3]])
    let column1 = new Float32Array([rhs[4],  rhs[5],  rhs[6],  rhs[7]])
    let column2 = new Float32Array([rhs[8],  rhs[9],  rhs[10], rhs[11]])
    let column3 = new Float32Array([rhs[12], rhs[13], rhs[14], rhs[15]])
    let row0    = new Float32Array([lhs[0],  lhs[4],  lhs[8],  lhs[12]])
    let row1    = new Float32Array([lhs[1],  lhs[5],  lhs[9],  lhs[13]])
    let row2    = new Float32Array([lhs[2],  lhs[6],  lhs[10], lhs[14]])
    let row3    = new Float32Array([lhs[3],  lhs[7],  lhs[11], lhs[15]])
    return new Float32Array([
        dot(row0, column0), dot(row1, column0), dot(row2, column0), dot(row3, column0),
        dot(row0, column1), dot(row1, column1), dot(row2, column1), dot(row3, column1),
        dot(row0, column2), dot(row1, column2), dot(row2, column2), dot(row3, column2),
        dot(row0, column3), dot(row1, column3), dot(row2, column3), dot(row3, column3)])
}

function multiplyv(lhs, rhs)
{
    let row0    = new Float32Array([rhs[0], rhs[4], rhs[8],  rhs[12]])
    let row1    = new Float32Array([rhs[1], rhs[5], rhs[9],  rhs[13]])
    let row2    = new Float32Array([rhs[2], rhs[6], rhs[10], rhs[14]])
    let row3    = new Float32Array([rhs[3], rhs[7], rhs[11], rhs[15]])
    return vec4(dot(lhs, row0), dot(lhs, row1), dot(lhs, row2), dot(lhs, row3))
}

function translate (x, y, z)
{
    return matrix(
        1.0, 0.0, 0.0, x,
        0.0, 1.0, 0.0, y,
        0.0, 0.0, 1.0, z,
        0.0, 0.0, 0.0, 1.0)
}

function scale (x, y, z)
{
    return matrix(
        x,   0.0, 0.0, 0.0,
        0.0, y,   0.0, 0.0,
        0.0, 0.0, z,   0.0,
        0.0, 0.0, 0.0, 1.0)
}

function pitch (x)
{
    return matrix(
        1.0,    0.0,     0.0,    0.0,
        0.0,    cos(x), -sin(x), 0.0,
        0.0,    sin(x),  cos(x), 0.0,
        0.0,    0.0,     0.0,    1.0);
}

function yaw (y)
{
    return matrix(
        cos(y),  0.0,  sin(y), 0.0,
        0.0,     1.0,  0.0,    0.0,
       -sin(y),  0.0,  cos(y), 0.0,
        0.0,     0.0,  0.0,    1.0
    )
}

function roll (z)
{
    return matrix(
        cos(z),  -sin(z),  0.0,   0.0,
        sin(z),   cos(z),  0.0,   0.0,
        0.0,      0.0,     1.0,   0.0,
        0.0,      0.0,     0.0,   1.0
    )
}

function rotate (x, y, z)
{
    return multiplym(pitch(x), yaw(y))
}

function rotateRev(x, y, z)
{
    return multiplym(yaw(y), pitch(x))
}

function perspective (fov, near, far, width, height)
{
    var s = 1.0 / Math.tan(fov * 0.5 * Math.PI / 180.0)
    var f = far
    var n = near
    var aspect = height / width
    return matrix(
        s * aspect, 0.0,   0.0,            0.0,
        0.0,        s,     0.0,            0.0,
        0.0,        0.0,  -(f / (f - n)), -(f * n / (f - n)),
        0.0,        0.0,  -1.0 ,           0.0);
}

function orthographic (width, near, far)
{
    var l = -(width / 2.0)
    var r =  (width / 2.0)
    var t =  (width / 2.0)
    var b = -(width / 2.0)
    var n =  near
    var f =  far

    return matrix(
        2.0 / (r - l), 0.0,           0.0,           -((r+l) / (r-l)),
        0.0,           2.0 / (t - b), 0.0,           -((t+b) / (t-b)),
        0.0,           0.0,           2.0 / (f - n), -((f+n) / (f-n)), 
        0.0,           0.0,           0.0,           1.0);
}

function basic ()
{
    return matrix(
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 1.0)
}

function print(matrix)
{
    console.log(
        matrix[0 ].toString() + " " + matrix[1 ].toString() + " " + matrix[2 ].toString() + " " + matrix[3].toString() + "\n" + 
        matrix[4 ].toString() + " " + matrix[5 ].toString() + " " + matrix[6 ].toString() + " " + matrix[7].toString() +"\n" + 
        matrix[8 ].toString() + " " + matrix[9 ].toString() + " " + matrix[10].toString() + " " + matrix[11].toString() +"\n" +
        matrix[12].toString() + " " + matrix[13].toString() + " " + matrix[14].toString() + " " + matrix[15].toString() +"\n");
}

function planeOrigin(p)
{
    let a = p[0]
    let b = p[1]
    let c = p[2]
    let d = p[3]
    let l = len([a, b, c])
    return [
        (a * d) / l,
        (b * d) / l,
        (c * d) / l
    ]
}

function planeNormalized(p)
{
    let l = len([p[0], p[1], p[2]])
    return [
        p[0] / l,
        p[1] / l,
        p[2] / l,
        p[3] / l
    ]
}

function halfPlaneTest(plane, p, s)
{
    plane = planeNormalized(plane)
    return (
        plane[0] * p[0] + 
        plane[1] * p[1] + 
        plane[2] * p[2] + 
        plane[3]) > -0.6;
}