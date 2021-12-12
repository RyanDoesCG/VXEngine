var BlurPassVertexShaderSource = `#version 300 es

precision lowp float;

    in vec4 vertex_position;
    in vec2 vertex_uvs;
    out vec2 frag_uvs;
    void main() 
    {
        gl_Position = vertex_position;
        frag_uvs = vertex_uvs;
    }`

var BlurPassFragmentShaderSource = `#version 300 es
    precision lowp float;
    uniform sampler2D FrameTexture;
    uniform int horizontal;
    float weight[5] = float[] (0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);


    in vec2 frag_uvs;

    out vec4 out_colour;

    void main()
    {
        vec2 offset = (1.0 / vec2(textureSize(FrameTexture, 0))) * 2.0;
        vec3 result = texture(FrameTexture, frag_uvs).rgb * weight[0];
        if (horizontal == 0)
        {
            for (int i = 1; i < 5; ++i)
            {
                result += texture(FrameTexture, frag_uvs + vec2(offset.x * float(i), 0.0)).rgb * weight[i];
                result += texture(FrameTexture, frag_uvs - vec2(offset.x * float(i), 0.0)).rgb * weight[i];
            }
        }
        else
        {
            for (int i = 1; i < 5; ++i)
            {
                result += texture(FrameTexture, frag_uvs + vec2(0.0, offset.y * float(i))).rgb * weight[i];
                result += texture(FrameTexture, frag_uvs - vec2(0.0, offset.y * float(i))).rgb * weight[i];
            }
        }
       // FragColor = vec4(result, 1.0);
        out_colour = vec4(result, 1.0);
        //out_colour = texture(FrameTexture, frag_uvs);
    }
`