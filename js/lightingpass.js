var LightingPassVertexShaderSource = 
    `#version 300 es
    precision highp sampler3D;

    in vec4 vertex_position;
    in vec2 vertex_uvs;

    out vec2 frag_uvs;

    void main() 
    {
        gl_Position = vertex_position;
        frag_uvs = vertex_uvs;
    }`

var LightingPassFragmentShaderHeaderSource = 
    `#version 300 es

    #define PI 3.1415926535

    precision highp sampler3D;
    precision highp float;

    uniform sampler2D AlbedoBuffer;
    uniform sampler2D NormalBuffer;
    uniform sampler2D PositionBuffer;

    uniform sampler2D WhiteNoise;
    uniform sampler2D BlueNoise;

    uniform float Time;
    uniform vec4 CameraPosition;

    uniform vec3 VolumePosition;
    uniform vec3 VolumeSize;

    uniform mat4 ViewToWorld;
    uniform mat4 WorldToView;

    in vec2 frag_uvs;

    out vec4 out_color;

    const float BIG_NUMBER = 10000.0;
`

var LightingPassFragmentShaderFooterSource = `
    float seed = 0.0;
    float random ()
    {
        seed += 0.01;
        return texture(
            BlueNoise, 
            vec2(sin(Time * 1.0), cos(Time * 1.0)) * 0.1
                + 
            (frag_uvs * 1.5) 
                + 
            vec2(seed)).x;
    }

    float random (float min, float max)
    {
        return min + random() * (max - min);
    }

    vec3 randomDirection()
    {
        float x = random(-1.0, 1.0);
        float y = random(-1.0, 1.0);
        float z = random(-1.0, 1.0);
        return normalize(vec3(x, y, z));
    }

    void main() 
    {
        vec4 Result;

        vec4 Albedo = texture(AlbedoBuffer, frag_uvs);
        vec4 Normal = -1.0 + (texture(NormalBuffer, frag_uvs) * 2.0);
        vec4 Position = texture(PositionBuffer, frag_uvs);

        if (Albedo.w == 0.0)
        {
            out_color = vec4(0.0);
            out_color.w = 1.0;
            return;
        }

        out_color = Albedo;

        {
            Ray BounceRay;
            BounceRay.origin = Position.xyz + Normal.xyz * 0.001;
            BounceRay.direction = normalize(Normal.xyz + randomDirection()).xyz;
            Hit BounceHit = IntersectVoxelsLinear(BounceRay);
            if (BounceHit.t < BIG_NUMBER)
            {
                //out_color.xyz += BounceHit.colour;
                out_color.xyz *= 0.1;
            }
        }



        //{
        //    Ray BounceRay;
        //    BounceRay.origin = Position.xyz + Normal.xyz * 0.001;
        //    BounceRay.direction = normalize(Normal.xyz + randomDirection()).xyz;
//
        //    Hit BounceHit = IntersectVoxelsLinear(BounceRay);
        //    if (BounceHit.t < BIG_NUMBER)
        //    {
        //        //out_color.xyz += BounceHit.colour;
        //        out_color.xyz *= 0.25;
        //    }
        //}
        
        float gamma = 2.2;
        out_color.rgb = pow(out_color.rgb, vec3(1.0/gamma));

    }`