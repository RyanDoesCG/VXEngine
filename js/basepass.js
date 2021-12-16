var basePassVertexShaderSource = 
    `#version 300 es

    precision highp float;
    precision highp int;

    #define NUM_VOLUMES 1

    uniform mat4 proj;
    uniform mat4 view;
    uniform mat4 transform;

    uniform float Time;
    uniform vec2 WindowSize;
        uniform int ShouldJitter;

    uniform vec4 CameraPosition;

    in vec3 vertex_position;
    in vec3 vertex_normal;
    in vec2 vertex_uv;

    out vec4 frag_worldpos;
    out vec3 frag_normal;
    out vec2 frag_uv;
    out vec3 frag_raydir;

    float random (vec2 st) 
    {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }    

    void main() 
    {
        float x = random(vec2(Time, 0.0) * 10.0);
        float y = random(vec2(0.0, Time) * 10.0);

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

    precision highp float;
    precision highp int;

    in vec4 frag_worldpos;
    in vec3 frag_normal;
    in vec2 frag_uv;
    in vec3 frag_raydir;

    uniform vec4 CameraPosition;
    uniform vec3 VolumePosition;
    uniform vec3 VolumeSize;

    uniform int ShouldJitter;
    uniform float Time;

    layout(location = 0) out vec4 out_color;
    layout(location = 1) out vec4 out_normal;
    layout(location = 2) out vec4 out_worldpos;
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

    float random (vec2 st) 
    {
        return fract(sin(dot(st.xy + sin(Time * 0.1), vec2(12.9898,78.233))) * 43758.5453123);
    }    

    void main() 
    {        
        vec3 rayjitter = vec3(0.0);
        //if (ShouldJitter == 1)
        //{
        //    rayjitter = vec3(random(frag_uv.xy), random(frag_uv.yx), 0.0) * 0.0001;
        //}

        Ray primaryRay;
        primaryRay.origin = CameraPosition.xyz;
        primaryRay.direction = normalize(frag_worldpos.xyz - CameraPosition.xyz) + rayjitter;

       // out_color = vec4(0.01, 0.01, 0.01, 1.0);
        
        //Hit primaryHit = IntersectVoxelsLinear(primaryRay);
        Hit primaryHit = IntersectVoxelsStepping(primaryRay);
    
        if (primaryHit.t < BIG_NUMBER)
        {
            out_color = vec4(primaryHit.colour, 1.0);
            out_normal   = vec4((primaryHit.normal.xyz + 1.0) * 0.5, 1.0);
            out_worldpos = vec4(primaryHit.position.xyz, primaryHit.t);
        }

    }`