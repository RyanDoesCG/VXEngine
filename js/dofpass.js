var DoFVertexShaderSource = `#version 300 es
    precision lowp float;
    in vec4 vertex_position;
    in vec2 vertex_uvs;
    out vec2 frag_uvs;
    void main() 
    {
        gl_Position = vertex_position;
        frag_uvs = vertex_uvs;
    }
`

var DoFFragmentShaderSource = `#version 300 es
    precision lowp float;

    uniform sampler2D BlurredScene;
    uniform sampler2D UnblurredScene;
    uniform sampler2D WorldPositionBuffer;

    in vec2 frag_uvs;

    out vec4 out_colour;

    void main ()
    {
        vec4 BlurSample = texture(BlurredScene, frag_uvs);
        vec4 UnblurredSample = texture(UnblurredScene, frag_uvs);
        float Depth = clamp(-1.0 + texture(WorldPositionBuffer, frag_uvs).w / 20.0, 0.0, 1.0);
      //  out_colour = UnblurredSample;
        out_colour = mix(UnblurredSample, BlurSample, Depth);
    }

`