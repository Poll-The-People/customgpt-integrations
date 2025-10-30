const sphereRad = 280 // 20..500
const radius_sp = 1 // 1..2
let framesPerRotation = 5000
let r, g, b  // particle color

// Helper function to check if light theme is active
const isLightTheme = () => {
    return document.body.classList.contains('light-theme');
}

// Dark theme colors
const setLightBlue = () => {
    if (isLightTheme()) {
        // Darker purple-blue for light theme
        r = 124
        g = 58
        b = 237
    } else {
        // Original cyan for dark theme
        r = 52
        g = 235
        b = 222
    }
}
const setOrange = () => {
    if (isLightTheme()) {
        // Darker orange for light theme
        r = 234
        g = 88
        b = 12
    } else {
        // Original bright orange for dark theme
        r = 255
        g = 191
        b = 0
    }
}
const setViolet = () => {
    if (isLightTheme()) {
        // Darker violet for light theme
        r = 109
        g = 40
        b = 217
    } else {
        // Original bright violet for dark theme
        r = 235
        g = 67
        b = 250
    }
}
const setFuchsia = () => {
    if (isLightTheme()) {
        // Darker magenta for light theme
        r = 147
        g = 51
        b = 234
    } else {
        // Original fuchsia for dark theme
        r = 201
        g = 10
        b = 144
    }
}

// Track current color state to re-evaluate theme on every frame
let currentColorState = 'idle'

const turnSpeed = () => 2 * Math.PI / framesPerRotation //the sphere will rotate at this speed (one complete rotation every 1600 frames).

const onUserSpeaking = () => {
    framesPerRotation = 5000
    currentColorState = 'userSpeaking'
    setOrange()
}
const onProcessing = () => {
    framesPerRotation = 1000
    currentColorState = 'processing'
    setViolet()
}
const onAiSpeaking = () => {
    framesPerRotation = 5000
    currentColorState = 'aiSpeaking'
    setFuchsia()
}
const reset = () => {
    framesPerRotation = 5000
    currentColorState = 'idle'
    setLightBlue()
}

const wait = 1
let count = wait - 1
const numToAddEachFrame = 8
const particleList = {
    first: undefined
}
const recycleBin = {
    first: undefined
}
const particleAlpha = 1 // maximum alpha
const fLen = 320 // represents the distance from the viewer to z=0 depth.
let m

// we will not draw coordinates if they have too large of a z-coordinate (which means they are very close to the observer).
const zMax = fLen - 2
let turnAngle = 1 //initial angle
const sphereCenterY = 0, sphereCenterZ = -3 - sphereRad
const particleRad = 2.5

//alpha values will lessen as particles move further back, causing depth-based darkening:
const zeroAlphaDepth = -750

//random acceleration factors - causes some random motion
const randAccelX = 0.1, randAccelY = 0.1, randAccelZ = 0.1
const gravity = -0 //try changing to a positive number (not too large, for example 0.3), or negative for floating upwards.
const rgbString = () => "rgba(" + r + "," + g + "," + b + "," //partial string for color which will be completed by appending alpha value.
//we are defining a lot of variables used in the screen update functions globally so that they don't have to be redefined every frame.
let p
let outsideTest
let nextParticle
let sinAngle
let cosAngle
let rotX, rotZ
let depthAlphaFactor
let i
let theta, phi
let x0, y0, z0

function draw(context, displayWidth, displayHeight, projCenterX, projCenterY) {
    // Re-evaluate colors based on current state and theme every frame
    switch (currentColorState) {
        case 'userSpeaking':
            setOrange()
            break
        case 'processing':
            setViolet()
            break
        case 'aiSpeaking':
            setFuchsia()
            break
        case 'idle':
        default:
            setLightBlue()
            break
    }

    //if enough time has elapsed, we will add new particles.
    count++
    if (count >= wait) {

        count = 0
        for (i = 0; i < numToAddEachFrame; i++) {
            theta = Math.random() * 2 * Math.PI
            phi = Math.acos(Math.random() * 2 - 1)
            x0 = sphereRad * Math.sin(phi) * Math.cos(theta)
            y0 = sphereRad * Math.sin(phi) * Math.sin(theta)
            z0 = sphereRad * Math.cos(phi)

            //We use the addParticle function to add a new particle. The parameters set the position and velocity components.
            //Note that the velocity parameters will cause the particle to initially fly outwards away from the sphere center (after
            //it becomes unstuck).
            const p = addParticle(x0, sphereCenterY + y0, sphereCenterZ + z0, 0.002 * x0, 0.002 * y0, 0.002 * z0)

            //we set some "envelope" parameters which will control the evolving alpha of the particles.
            p.attack = 50
            p.hold = 50
            p.decay = 100
            p.initValue = 0
            p.holdValue = particleAlpha
            p.lastValue = 0

            //the particle will be stuck in one place until this time has elapsed:
            p.stuckTime = 90 + Math.random() * 20

            p.accelX = 0
            p.accelY = gravity
            p.accelZ = 0
        }
    }

    //update viewing angle
    turnAngle = (turnAngle + turnSpeed()) % (2 * Math.PI)
    sinAngle = Math.sin(turnAngle)
    cosAngle = Math.cos(turnAngle)

    //background fill - use CSS variable for theme support
    // Read from body to get light-theme overrides, fallback to documentElement for :root vars
    const bodyStyles = getComputedStyle(document.body);
    const bgColor = bodyStyles.getPropertyValue('--bg-primary').trim() || '#0f172a';
    context.fillStyle = bgColor;
    context.fillRect(0, 0, displayWidth, displayHeight)

    //update and draw particles
    p = particleList.first
    while (p != null) {
        //before list is altered record next particle
        nextParticle = p.next

        //update age
        p.age++

        //if the particle is past its "stuck" time, it will begin to move.
        if (p.age > p.stuckTime) {
            p.velX += p.accelX + randAccelX * (Math.random() * 2 - 1)
            p.velY += p.accelY + randAccelY * (Math.random() * 2 - 1)
            p.velZ += p.accelZ + randAccelZ * (Math.random() * 2 - 1)

            p.x += p.velX
            p.y += p.velY
            p.z += p.velZ
        }

        /*
        We are doing two things here to calculate display coordinates.
        The whole display is being rotated around a vertical axis, so we first calculate rotated coordinates for
        x and z (but the y coordinate will not change).
        Then, we take the new coordinates (rotX, y, rotZ), and project these onto the 2D view plane.
        */
        rotX = cosAngle * p.x + sinAngle * (p.z - sphereCenterZ)
        rotZ = -sinAngle * p.x + cosAngle * (p.z - sphereCenterZ) + sphereCenterZ
        m = radius_sp * fLen / (fLen - rotZ)
        p.projX = rotX * m + projCenterX
        p.projY = p.y * m + projCenterY

        //update alpha according to envelope parameters.
        if (p.age < p.attack + p.hold + p.decay) {
            if (p.age < p.attack) {
                p.alpha = (p.holdValue - p.initValue) / p.attack * p.age + p.initValue
            } else if (p.age < p.attack + p.hold) {
                p.alpha = p.holdValue
            } else if (p.age < p.attack + p.hold + p.decay) {
                p.alpha = (p.lastValue - p.holdValue) / p.decay * (p.age - p.attack - p.hold) + p.holdValue
            }
        } else {
            p.dead = true
        }

        //see if the particle is still within the viewable range.
        outsideTest = (p.projX > displayWidth) || (p.projX < 0) || (p.projY < 0) || (p.projY > displayHeight) || (rotZ > zMax);

        if (outsideTest || p.dead) {
            recycle(p)
        } else {
            //depth-dependent darkening
            depthAlphaFactor = (1 - rotZ / zeroAlphaDepth)
            depthAlphaFactor = (depthAlphaFactor > 1) ? 1 : ((depthAlphaFactor < 0) ? 0 : depthAlphaFactor)
            context.fillStyle = rgbString() + depthAlphaFactor * p.alpha + ")"

            //draw
            context.beginPath()
            context.arc(p.projX, p.projY, m * particleRad, 0, 2 * Math.PI, false)
            context.closePath()
            context.fill()
        }

        p = nextParticle
    }
}

function addParticle(x0, y0, z0, vx0, vy0, vz0) {
    let newParticle

    //check recycle bin for available drop:
    if (recycleBin.first != null) {
        newParticle = recycleBin.first
        //remove from bin
        if (newParticle.next != null) {
            recycleBin.first = newParticle.next
            newParticle.next.prev = null
        } else {
            recycleBin.first = null
        }
    }
    //if the recycle bin is empty, create a new particle (a new empty object):
    else {
        newParticle = {}
    }

    //add to beginning of particle list
    if (particleList.first == null) {
        particleList.first = newParticle
        newParticle.prev = null
        newParticle.next = null
    } else {
        newParticle.next = particleList.first
        particleList.first.prev = newParticle
        particleList.first = newParticle
        newParticle.prev = null
    }

    //initialize
    newParticle.x = x0
    newParticle.y = y0
    newParticle.z = z0
    newParticle.velX = vx0
    newParticle.velY = vy0
    newParticle.velZ = vz0
    newParticle.age = 0
    newParticle.dead = false
    newParticle.right = Math.random() < 0.5;
    return newParticle
}

function recycle(p) {
    //remove from particleList
    if (particleList.first === p) {
        if (p.next != null) {
            p.next.prev = null
            particleList.first = p.next
        } else {
            particleList.first = null
        }
    } else {
        if (p.next == null) {
            p.prev.next = null
        } else {
            p.prev.next = p.next
            p.next.prev = p.prev
        }
    }
    //add to recycle bin
    if (recycleBin.first == null) {
        recycleBin.first = p
        p.prev = null
        p.next = null
    } else {
        p.next = recycleBin.first
        recycleBin.first.prev = p
        recycleBin.first = p
        p.prev = null
    }
}

export const particleActions = {
    onUserSpeaking,
    onProcessing,
    onAiSpeaking,
    reset,
    draw
};
