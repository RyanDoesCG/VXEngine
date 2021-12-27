var FogPassVertexShaderSource = `#version 300 es
    precision lowp float;
    in vec4 vertex_position;
    in vec2 vertex_uvs;
    out vec2 frag_uvs;
    void main() 
    {
        gl_Position = vertex_position;
        frag_uvs = vertex_uvs;
    }`

var FogPassFragmentShaderSource = `#version 300 es
    precision lowp float;

    uniform sampler2D SceneTexture;
    uniform sampler2D PositionTexture;

    #define FOG_COLOUR vec4(0.3, 0.3, 0.3, 1.0)

    #define FOG_DISTANCE 60.0

    in vec2 frag_uvs;

    out vec4 out_colour;

    void main()
    {
        vec4 Scene = texture(SceneTexture, frag_uvs);
        float t = texture(PositionTexture, frag_uvs).w;
        float f = clamp(0.0, FOG_DISTANCE, t) / FOG_DISTANCE;
        out_colour = mix(Scene, FOG_COLOUR, min(f, 0.96));
    }
`