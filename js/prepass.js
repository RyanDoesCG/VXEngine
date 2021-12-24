var prePassVertexShaderSource = 
    `#version 300 es

    precision lowp float;
    precision lowp int;

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
    }`

var prePassFragmentShaderSource = 
`#version 300 es

precision lowp float;

uniform vec4 CameraPosition;

in vec4 frag_worldpos;

layout(location = 0) out vec4 out_color;

void main ()
{
    out_color = vec4(
        distance(CameraPosition.xyz, frag_worldpos.xyz),
        0.0,
        0.0,
        1.0);
}
`