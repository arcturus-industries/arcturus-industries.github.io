var canvas = document.querySelector('#scene');
var width = canvas.offsetWidth,
    height = canvas.offsetHeight;

var colors = [
    new THREE.Color(0xac1122),
    // new THREE.Color(0x96789f),
    new THREE.Color(0x252525)
];

var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});
renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
renderer.setSize(width, height);
renderer.setClearColor(0x101010);

var scene = new THREE.Scene();

var raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 6;

var camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
camera.position.set(0, 0, 350);

var galaxy = new THREE.Group();
scene.add(galaxy);

// Generate dots
var dotsAmount = 3000;
var dots = [];
var dotsPositions = new Float32Array(dotsAmount * 3);
var dotsSizes = new Float32Array(dotsAmount);
var dotsColors = new Float32Array(dotsAmount * 3);

for (var i = 0; i < dotsAmount; i++) {
    var vector = new THREE.Vector3();

    vector.color = Math.floor(Math.random() * colors.length);
    vector.theta = Math.random() * Math.PI * 2;
    vector.phi =
        (1 - Math.sqrt(Math.random())) *
        Math.PI /
        2 *
        (Math.random() > 0.5 ? 1 : -1);

    // position
    vector.x = Math.cos(vector.theta) * Math.cos(vector.phi);
    vector.y = Math.sin(vector.phi);
    vector.z = Math.sin(vector.theta) * Math.cos(vector.phi);
    vector.multiplyScalar(135 + (Math.random() - 0.5) * 5);

    // back-up position
    vector.original_x = vector.x;
    vector.original_y = vector.y;
    vector.original_z = vector.z;

    // scale
    vector.scaleX = 5;

    if (Math.random() > 0.5) {
        moveDot(vector, i);
    }

    dots.push(vector);
    
    vector.toArray(dotsPositions, i * 3);
    dotsSizes[i] = vector.scaleX;
    colors[vector.color].toArray(dotsColors, i*3);
}

function moveDot(vector, index) {
        var tempVector = vector.clone();
        tempVector.multiplyScalar((Math.random() - 0.5) * 0.2 + 1);
        TweenMax.to(vector, Math.random() * 3 + 3, {
            x: tempVector.x,
            y: tempVector.y,
            z: tempVector.z,
            yoyo: true,
            repeat: -1,
            delay: -Math.random() * 3,
            ease: Power0.easeNone,
            onUpdate: function () {
                dotsPositions[index*3] = vector.x;
                dotsPositions[index*3+1] = vector.y;
                dotsPositions[index*3+2] = vector.z;
            }
        });
}

var dotsGeometry = new THREE.BufferGeometry();
var attributePositions = new THREE.BufferAttribute(dotsPositions, 3);
dotsGeometry.setAttribute('position', attributePositions);
var attributeSizes = new THREE.BufferAttribute(dotsSizes, 1);
dotsGeometry.setAttribute('size', attributeSizes);
var attributeColors = new THREE.BufferAttribute(dotsColors, 3);
dotsGeometry.setAttribute('color', attributeColors);

var loader = new THREE.TextureLoader();
loader.crossOrigin = "";
var dotTexture = loader.load("images/js/dotTexture.png");

var shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
        texture1: {
            value: dotTexture
        }
    },
    vertexShader: document.getElementById("wrapVertexShader").textContent,
    fragmentShader: document.getElementById("wrapFragmentShader").textContent,
    transparent:true
});
var dotsPoints = new THREE.Points(dotsGeometry, shaderMaterial);
galaxy.add(dotsPoints);

// Generate segments
var segmentsIndices = [];

for (i = dotsAmount - 1; i >= 0; i--) {
    var vector_i = new THREE.Vector3(dotsPositions[3*i], dotsPositions[3*i+1], dotsPositions[3*i+2]);
    for (var j = dotsAmount - 1; j >= 0; j--) {
        var vector_j = new THREE.Vector3(dotsPositions[3*j], dotsPositions[3*j+1], dotsPositions[3*j+2]);
        if (i !== j && vector_i.distanceTo(vector_j) < 12) {
            segmentsIndices.push(i);
            segmentsIndices.push(j);
        }
    }
}

var segmentsGeom = new THREE.BufferGeometry();
var segmentsMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    vertexColors: THREE.VertexColors
});

var segmentsAttributePositions = new THREE.BufferAttribute(dotsPositions, 3);
segmentsGeom.setAttribute('position', attributePositions);
segmentsGeom.setAttribute('color', new THREE.BufferAttribute(dotsColors, 3));
segmentsGeom.setIndex(new THREE.BufferAttribute(new Uint16Array(segmentsIndices), 1));

var segments = new THREE.LineSegments(segmentsGeom, segmentsMat);
galaxy.add(segments);

var hovered = [];
var prevHovered = [];
function render(a) {
    var i;

    // intersection with points
    raycaster.setFromCamera( mouse, camera );
    var intersections = raycaster.intersectObjects([dotsPoints]);

    // animation increasing point size if intersection
    hovered = [];
    if (intersections.length) {
        for(i = 0; i < intersections.length; i++) {
            var index = intersections[i].index;
            hovered.push(index);
            if (prevHovered.indexOf(index) === -1) {
                onDotHover(index);
            }
        }
    }

    // animation to go back to normal size
    for(i = 0; i < prevHovered.length; i++){
        if(hovered.indexOf(prevHovered[i]) === -1){
            mouseOut(prevHovered[i]);
        }
    }
    prevHovered = hovered.slice(0);

    // tell renderer to update values
    segmentsAttributePositions.needsUpdate = true;
    attributePositions.needsUpdate = true;
    attributeSizes.needsUpdate = true;
    renderer.render(scene, camera);
}

function onDotHover(index) {
    dots[index].tl = new TimelineMax();
    dots[index].tl.to(dots[index], 1, {
        scaleX: 10,
        ease: Elastic.easeOut.config(2, 0.2),
        onUpdate: function() {
            attributeSizes.array[index] = dots[index].scaleX;
        }
    });
}

function mouseOut(index) {
    dots[index].tl.to(dots[index], 0.4, {
        scaleX: 5,
        ease: Power2.easeOut,
        onUpdate: function() {
            attributeSizes.array[index] = dots[index].scaleX;
        }
    });
}

// function onDotHover(index) {
//     var tempVector = dots[index].clone();
//     tempVector.multiplyScalar((Math.random() - 0.5) * 0.2 + 1);

//     dots[index].tl = new TimelineMax();
//     dots[index].tl.to(dots[index], -1, {
//         x: tempVector.x,
//         y: tempVector.y,
//         z: tempVector.z,
//         ease: Elastic.easeOut.config(2, 0.2),
//         onUpdate: function() {
//             dotsPositions[index*3] = dots[index].x;
//             dotsPositions[index*3+1] = dots[index].y;
//             dotsPositions[index*3+2] = dots[index].z;
//         }
//     });
// }

// function mouseOut(index) {
//     dots[index].tl.to(dots[index], 0.4, {
//         x: dots[index].original_x,
//         y: dots[index].original_y,
//         z: dots[index].original_z,
//         ease: Power2.easeOut,
//         onUpdate: function() {
//             dotsPositions[index*3] = dots[index].x;
//             dotsPositions[index*3+1] = dots[index].y;
//             dotsPositions[index*3+2] = dots[index].z;
//         }
//     });
// }

// mouse position
var mouse = new THREE.Vector2(-100,-100);
function onMouseMove(e) {
    var canvasBounding = canvas.getBoundingClientRect();
    var x, y;
    if(e.type == 'touchstart' || e.type == 'touchmove' || e.type == 'touchend' || e.type == 'touchcancel'){
        var touch = e.targetTouches[0] || e.touches[0] || e.changedTouches[0];
        x = touch.pageX - window.scrollX;
        y = touch.pageY - window.scrollY;
    } else if (e.type == 'mousedown' || e.type == 'mouseup' || e.type == 'mousemove' || e.type == 'mouseover'|| e.type=='mouseout' || e.type=='mouseenter' || e.type=='mouseleave') {
        x = e.clientX;
        y = e.clientY;
    }
    // relationship bitmap vs. element for X
    mouse.x = ((x - canvasBounding.left) / canvasBounding.width) * 2 - 1;
    mouse.y = -((y - canvasBounding.top) / canvasBounding.height) * 2 + 1;
}

TweenMax.ticker.addEventListener("tick", render);
window.addEventListener("mousemove", onMouseMove, false);
window.addEventListener("touchstart", onMouseMove, false);
window.addEventListener("touchmove", onMouseMove, false);

// resize 
function onResize() {
    canvas.style.width = '';
    canvas.style.height = '';
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

window.addEventListener("resize", onResize);