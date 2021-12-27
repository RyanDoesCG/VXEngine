function createFramebuffer(gl, target)
{
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, 
        gl.COLOR_ATTACHMENT0, 
        gl.TEXTURE_2D, 
        target, 
        0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) 
        alert("Framebuffer creation failed")
    return framebuffer;
}

function createFramebuffer(gl, targetA, targetB)
{
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, 
        gl.COLOR_ATTACHMENT0, 
        gl.TEXTURE_2D, 
        targetA, 
        0);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, 
        gl.COLOR_ATTACHMENT1, 
        gl.TEXTURE_2D, 
        targetB, 
        0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) 
        alert("Framebuffer creation failed")
    return framebuffer;
}

function createFramebuffer(gl, targetA, targetB, targetC)
{
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, 
        gl.COLOR_ATTACHMENT0, 
        gl.TEXTURE_2D, 
        targetA, 
        0);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, 
        gl.COLOR_ATTACHMENT1, 
        gl.TEXTURE_2D, 
        targetB, 
        0);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, 
        gl.COLOR_ATTACHMENT2, 
        gl.TEXTURE_2D, 
        targetC, 
        0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) 
        alert("Framebuffer creation failed")
    return framebuffer;
}

function createFramebuffer(gl, targetA, targetB, targetC, targetD)
{
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, 
        gl.COLOR_ATTACHMENT0, 
        gl.TEXTURE_2D, 
        targetA, 
        0);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, 
        gl.COLOR_ATTACHMENT1, 
        gl.TEXTURE_2D, 
        targetB, 
        0);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, 
        gl.COLOR_ATTACHMENT2, 
        gl.TEXTURE_2D, 
        targetC, 
        0);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, 
        gl.DEPTH_ATTACHMENT, 
        gl.TEXTURE_2D, 
        targetD, 
        0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) 
        alert("Framebuffer creation failed")
    return framebuffer;
}