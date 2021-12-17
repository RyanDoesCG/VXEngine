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

    uniform mat4 ViewToWorld;
    uniform mat4 WorldToView;

    uniform int Light;
    uniform vec3 LightDirection;
    uniform vec3 LightPosition;
    uniform vec3 LightColour;

    in vec2 frag_uvs;

    out vec4 out_color;

    const float BIG_NUMBER = 10000.0;
`

var LightingPassFragmentShaderFooterSource = `

    #define GOLDEN_RATIO 1.61803398875

    float seed = 0.0;
    float random ()
    {
        /*
        seed += 0.01;
        float noise = texture(BlueNoise, frag_uvs + vec2(seed)).r;
        noise = mod(noise + GOLDEN_RATIO * (mod(Time * 2.0, 100.0)), 1.0);
        return noise;
        */
        
        seed += 0.01;
        return texture(
            BlueNoise, 
            vec2(sin(Time * 1.0), cos(Time * 1.0)) * 0.1
                + 
            (frag_uvs) 
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

        if (Light == 1)
        {
            vec3 RayDir = normalize(Position.xyz - CameraPosition.xyz);
            vec3 ToLightDir = normalize(LightPosition.xyz - Position.xyz);
            float attenuation = 100.0 - distance(Position.xyz, LightPosition.xyz);
            float d = pow(dot(RayDir, LightDirection), 100.0) * 1.0;
            {
                float Lighting = (d * max(0.0, dot(ToLightDir, Normal.xyz)) * (attenuation / 100.0) * 40.0);
                out_color += Lighting + random(-1.0, 1.0) * 1.0;
            }
        }

        {
            Ray BounceRay;
            BounceRay.origin = Position.xyz + Normal.xyz * 0.001;
            BounceRay.direction = normalize(Normal.xyz + randomDirection()).xyz;
            Hit BounceHit = IntersectVoxelsLinear(BounceRay);
            if (BounceHit.t < BIG_NUMBER)
            {
                //out_color.xyz += BounceHit.colour;
                out_color.xyz *= 0.01;
            }
        }
        {
            Ray BounceRay;
            BounceRay.origin = Position.xyz + Normal.xyz * 0.001;
            BounceRay.direction = normalize(Normal.xyz + randomDirection()).xyz;
            Hit BounceHit = IntersectVoxelsLinear(BounceRay);
            if (BounceHit.t < BIG_NUMBER)
            {
                //out_color.xyz += BounceHit.colour;
                out_color.xyz *= 0.01;
            }
        }


        float gamma = 2.2;
        out_color.rgb = pow(out_color.rgb, vec3(1.0/gamma));

    }`