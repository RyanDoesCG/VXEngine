var basePassVertexShaderSource = 
    `#version 300 es

    precision highp sampler3D;
    precision highp float;
    precision highp int;

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
    out vec3 frag_normal;
    out vec2 frag_uv;
    out vec3 frag_raydir;

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
        frag_normal = (vec4(vertex_normal, 0.0)).xyz;
        frag_uv = vertex_uv;
        frag_raydir = normalize(frag_worldpos.xyz - CameraPosition.xyz);
    }`

var basePassFragmentShaderSourceHeader = 
    `#version 300 es

    #define BIG_NUMBER 100000.0
    #define SMALL_NUMBER 0.0001

    precision highp sampler3D;
    precision highp float;
    precision highp int;

    in vec4 frag_worldpos;
    in vec3 frag_normal;
    in vec2 frag_uv;
    in vec3 frag_raydir;

    uniform vec2 WindowSize;
    uniform vec4 CameraPosition;

    uniform sampler2D BlueNoise;

    uniform sampler2D TBuffer;

    uniform int ShouldAmbientOcclusion;
    uniform int ShouldJitter;
    uniform float Time;

    layout(location = 0) out vec4 out_color;
    layout(location = 1) out vec4 out_worldpos;

    float seed = 0.0;
    float random ()
    {
        vec2 uv = gl_FragCoord.xy / vec2(512.0, 512.0);
        seed += 0.01;
        float tiling = 20.0;
        float noise = texture(BlueNoise, uv * tiling + vec2(seed)).r;
        return noise;
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
`

var basePassFragmentShaderSourceBody = `
    float grid (vec3 uv, float Thickness)
    {
        return mix(
            0.0, 
            1.0, 
            float((fract((uv.x ) * 1.0) > Thickness) || 
                (fract((uv.y) * 1.0) > Thickness)));
    }

    float checkerboard(vec2 uv, float thickness)
    {
        uv *= thickness;
        return mod(floor(uv.x) + floor(uv.y), 2.0);
    }

    void main() 
    {        
        vec3 rayjitter = vec3(0.0);
        //if (ShouldJitter == 1)
        //{
        //    rayjitter = vec3(random(), random(), 0.0) * 0.0025;
        //}

        vec2 screenUV = gl_FragCoord.xy / vec2(WindowSize.xy);

        float t1 = distance(frag_worldpos.xyz, CameraPosition.xyz);
        float t2 = texture(TBuffer, screenUV).r;

        vec3 VolumeMin = VolumePosition + (-VolumeSize * 0.5);
        vec3 VolumeMax = VolumePosition + ( VolumeSize * 0.5);
        if (CameraPosition.x < VolumeMax.x && CameraPosition.x > VolumeMin.x && 
            CameraPosition.y < VolumeMax.y && CameraPosition.y > VolumeMin.y &&
            CameraPosition.z < VolumeMax.z && CameraPosition.z > VolumeMin.z)
        {
            t1 = 0.0;
        }

        Ray primaryRay;
        primaryRay.origin = CameraPosition.xyz;
        primaryRay.direction = normalize(frag_worldpos.xyz - CameraPosition.xyz) + rayjitter;

        Hit primaryHit = IntersectVoxelsStepping(primaryRay, t1, t2, frag_normal.xyz);

        if (primaryHit.t < BIG_NUMBER)
        {
            out_color = vec4(primaryHit.colour, 0.5);

            if (ShouldAmbientOcclusion == 1)
            {
                if (!isLight(primaryHit.id))   
                {
                    {
                        Ray BounceRay;
                        BounceRay.origin = primaryHit.position.xyz + primaryHit.normal.xyz * 0.001;
                        BounceRay.direction = normalize(primaryHit.normal.xyz + randomDirection()).xyz;
                        Hit BounceHit = IntersectVoxelsLinear(BounceRay, 0.0, 2.0, 4);
                        if (BounceHit.t < BIG_NUMBER)
                        {
                            out_color.xyz += BounceHit.colour;
                            if (!isLight(BounceHit.id))
                            {
                                out_color.xyz *= 0.01;
                            }
                            else
                            {
                                out_color.xyz += BounceHit.colour;
                            }
                        }
                    }

                    {
                        Ray BounceRay;
                        BounceRay.origin = primaryHit.position.xyz + primaryHit.normal.xyz * 0.001;
                        BounceRay.direction = normalize(primaryHit.normal.xyz + randomDirection()).xyz;
                        Hit BounceHit = IntersectVoxelsLinear(BounceRay, 4.0, 100.0, 8);
                        if (BounceHit.t < BIG_NUMBER)
                        {
                            out_color.xyz += BounceHit.colour;
                            if (!isLight(BounceHit.id))
                            {
                                out_color.xyz *= 0.01;
                            }
                            else
                            {
                                out_color.xyz += BounceHit.colour;
                            }
                        }
                    }
                }
            }
            
            out_worldpos = vec4(primaryHit.position.xyz, primaryHit.t);
        }

        float gamma = 2.2;
        out_color.rgb = pow(out_color.rgb, vec3(1.0/gamma));

    }`