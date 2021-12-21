var TAAPassVertexShaderSource = 
    `#version 300 es
    in vec4 vertex_position;
    in vec2 vertex_uvs;
    out vec2 frag_uvs;
    void main() 
    {
        gl_Position = vertex_position;
        frag_uvs = vertex_uvs;
    }`

var TAAPassFragmentShaderHeaderSource = 
    `#version 300 es
    precision lowp float;

    #define NFrames 15

    uniform sampler2D WorldPositionBuffer;

    uniform sampler2D Frames[NFrames];
    uniform mat4      View0;
    uniform mat4      View1;
    uniform mat4      View2;
    uniform mat4      View3;
    uniform mat4      View4;
    uniform mat4      View5;
    uniform mat4      View6;
    uniform mat4      View7;
    uniform mat4      View8;
    uniform mat4      View9;
    uniform mat4      View10;
    uniform mat4      View11;
    uniform mat4      View12;
    uniform mat4      View13;
    uniform mat4      View14;

    uniform vec4 CameraPosition;
    uniform vec4 CameraForward;

    uniform float Near;
    uniform float Far;

    uniform float Time;

    in vec2 frag_uvs;
    out vec4 out_color;
`

var TAAPassFragmentShaderFooterSource = `


    bool shouldRejectSample (vec2 uv)
    {
        bool inRange = uv.x < 1.0 && uv.x > 0.0 && uv.y < 1.0 && uv.y > 0.0;
        bool farFromCurrentPixel = length(uv - frag_uvs) > 0.02;
        return !inRange || farFromCurrentPixel;
    }

    void main() 
    {
        vec4 Result = vec4(0.0, 0.0, 0.0, 1.0);

        vec4 position = texture(WorldPositionBuffer, frag_uvs);
        position.w = 1.0;

       // position = inverse(View0) * position;

        const float MaxWeight = 1.0;
        const float MinWeight = 0.25;

        float weight = 1.0;
        float samples = 0.0;

        vec4 pl = position;
        vec2 uv = frag_uvs;
        Result += texture(Frames[0], uv) * weight;
        samples += 1.0;

        if (position.w == 0.0)
        {
            out_color = vec4(Result.xyz, 1.0) * weight;
            return;
        }

        pl = View1 * position;
        uv = (0.5 * (pl.xy / pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[1],  uv) * weight;
            samples += 1.0;
        }

        pl = View2 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[2],  uv) * weight;
            samples += 1.0;
        }

        pl = View3 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[3],  uv) * weight;
            samples += 1.0;
        }

        pl = View4 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[4],  uv) * weight;
            samples += 1.0;
        }

        pl = View5 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[5],  uv) * weight;
            samples += 1.0;
        }

        pl = View6 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[6],  uv) * weight;
            samples += 1.0;
        }

        pl = View7 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[7],  uv) * weight;
            samples += 1.0;
        }

        pl = View8 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[8],  uv) * weight;
            samples += 1.0;
        }

        pl = View9 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[9],  uv) * weight;
            samples += 1.0;
        }

        pl = View10 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[10],  uv) * weight;
            samples += 1.0;
        }

        pl = View11 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[11],  uv) * weight;
            samples += 1.0;
        }

        pl = View12 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[12],  uv) * weight;
            samples += 1.0;
        }

        pl = View13 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[13],  uv) * weight;
            samples += 1.0;
        }

        pl = View14 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[14],  uv) * weight;
            samples += 1.0;
        }

        out_color = vec4(Result.xyz / samples, 1.0);
    }`


    /*
 `    {
        vec4 Result = vec4(0.0, 0.0, 0.0, 1.0);

        vec4 position = texture(WorldPositionBuffer, frag_uvs);

        const float MaxWeight = 1.0;
        const float MinWeight = 0.25;

        float weight = 1.0;
        float samples = 0.0;

        vec4 pl = position;
        vec2 uv = frag_uvs;
        Result += texture(Frames[0], uv) * weight;
        samples += 1.0;

        if (position.w == 0.0)
        {
            out_color = vec4(Result.xyz, 1.0) * weight;
            return;
        }

        pl = View1 * position;
        uv = (0.5 * (pl.xy / pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[1],  uv) * weight;
            samples += 1.0;
        }

        pl = View2 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[2],  uv) * weight;
            samples += 1.0;
        }

        pl = View3 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[3],  uv) * weight;
            samples += 1.0;
        }

        pl = View4 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[4],  uv) * weight;
            samples += 1.0;
        }

        pl = View5 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[5],  uv) * weight;
            samples += 1.0;
        }

        pl = View6 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[6],  uv) * weight;
            samples += 1.0;
        }

        pl = View7 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[7],  uv) * weight;
            samples += 1.0;
        }

        pl = View8 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[8],  uv) * weight;
            samples += 1.0;
        }

        pl = View9 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[9],  uv) * weight;
            samples += 1.0;
        }

        pl = View10 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[10],  uv) * weight;
            samples += 1.0;
        }

        pl = View11 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[11],  uv) * weight;
            samples += 1.0;
        }

        pl = View12 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[12],  uv) * weight;
            samples += 1.0;
        }

        pl = View13 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[13],  uv) * weight;
            samples += 1.0;
        }

        pl = View14 * position;
        uv = (0.5 * (pl.xy/ pl.w) + 0.5);
        if (!shouldRejectSample(uv))
        {
            Result += texture(Frames[14],  uv) * weight;
            samples += 1.0;
        }

        out_color = vec4(Result.xyz / samples, 1.0);
    }
     */