function createShader(gl, stage, source) 
{
    var shader = gl.createShader(stage);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) 
    {
        return shader;
    }

    var log = gl.getShaderInfoLog(shader);
    console.log (log)
    var error = log.split(':')

    var lines = source.split('\n')
    var line = error[2];

    var goodcode = source.split(lines[line-1])[0]
    var badcode = (lines[line])
    var goodcode2 = source.split(lines[line-1])[1]

    console.log(goodcode + '%c'+lines[line-1]+'%c'+ goodcode2 , 'background-color:red;', '');

    gl.deleteShader(shader);
}

function createProgram(gl, vertexStage, FragmentStage) 
{
    var program = gl.createProgram();
    gl.attachShader(program, vertexStage);
    gl.attachShader(program, FragmentStage);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
      return program;
    }
   
    alert(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}