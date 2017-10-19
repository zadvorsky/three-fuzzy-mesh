
function FuzzyMesh(params) {
  const config = this.config = {
    useNormals: true,
    hairLength: 4,
    hairRadialSegments: 4,
    hairHeightSegments: 16,
    hairBase: 0.05,
    minFlex: 0.8,
    maxFlex: 1.2,
    fuzz: 0.5,
    gravity: 2.0,
    centrifugalForceFactor: 2.0,
    movementForceFactor: 0.75,
    movementDecay: 0.7,
    centrifugalDecay: 0.7,
    settleDecay: 0.97, // should always be higher than movementDecay and centrifugal decay
    ...params.config
  };

  const positions = params.model.vertices;
  const prefab = new THREE.ConeGeometry(
    config.hairBase,
    config.hairLength,
    config.hairRadialSegments,
    config.hairHeightSegments,
    true
  );

  prefab.translate(0, config.hairLength * 0.5, 0);

  const geometry = new BAS.PrefabBufferGeometry(prefab, positions.length);

  geometry.createAttribute('flex', 1, (data) => {
    data[0] = THREE.Math.randFloat(config.minFlex, config.maxFlex);
  });

  geometry.createAttribute('settleOffset', 1, (data) => {
    data[0] = THREE.Math.randFloat(0, Math.PI);
  });

  geometry.createAttribute('hairPosition', 3, (data, i) => {
    positions[i].toArray(data);
  });

  // bake normal based rotations into the position buffer
  const baseDirectionBuffer = geometry.createAttribute('baseDirection', 3).array;

  let directions;

  if (config.useNormals === true) {
    const m = params.model;
    m.computeVertexNormals();

    directions = [];

    for (let i = 0; i < m.faces.length; i++) {
      const face = m.faces[i];

      directions[face.a] = face.vertexNormals[0];
      directions[face.b] = face.vertexNormals[1];
      directions[face.c] = face.vertexNormals[2];
    }
  }
  else {
    directions = positions;
  }

  const normal = new THREE.Vector3();

  for (let i = 0, offset = 0; i < positions.length; i++) {
    normal.copy(directions[i]);
    normal.x += THREE.Math.randFloatSpread(config.fuzz);
    normal.y += THREE.Math.randFloatSpread(config.fuzz);
    normal.z += THREE.Math.randFloatSpread(config.fuzz);
    normal.normalize();

    for (let j = 0; j < geometry.prefabVertexCount; j++, offset += 3) {
      baseDirectionBuffer[offset    ] = normal.x;
      baseDirectionBuffer[offset + 1] = normal.y;
      baseDirectionBuffer[offset + 2] = normal.z;
    }
  }

  const material = new BAS.StandardAnimationMaterial({
    flatShading: true,
    wireframe: false,
    uniformValues: {
      metalness: 0.5,
      roughness: 1.0
    },
    uniforms: {
      hairLength: {value: config.hairLength},
      settleTime: {value: 0.0},
      settleScale: {value: 1.0},
      globalForce: {value: new THREE.Vector3(0.0, -config.gravity, 0.0)},

      centrifugalForce: {value: 0.0},
      centrifugalAxis: {value: new THREE.Vector3()}
    },
    defines: {
      'HAIR_LENGTH': (config.hairLength).toFixed(2),
      'SEGMENT_STEP': (config.hairLength / config.hairHeightSegments).toFixed(2),
      'FORCE_STEP': (1.0 / config.hairLength).toFixed(2)
    },
    vertexParameters: `
      uniform float hairLength;
      uniform float heightSteps;
      uniform float heightStepSize;

      uniform vec3 globalForce;
      uniform float centrifugalForce;
      uniform vec3 centrifugalAxis;
      uniform float settleTime;
      uniform float settleScale;
      
      attribute float flex;
      attribute float settleOffset;
      attribute vec3 hairPosition;
      attribute vec3 baseDirection;
      
      vec3 UP = vec3(0.0, 1.0, 0.0);
    `,
    vertexFunctions: [
      BAS.ShaderChunk.quaternion_rotation,
      `
      // based on THREE.Quaternion.setFromUnitVectors
      // would be great if we can get rid of the conditionals
      vec4 quatFromUnitVectors(vec3 from, vec3 to) {
        vec3 v;
        float r = dot(from, to) + 1.0;
        
        if (r < 0.00001) {
          r = 0.0;
          
          if (abs(from.x) > abs(from.z)) {
            v.x = -from.y;
            v.y = from.x;
            v.z = 0.0;
          }
          else {
            v.x = 0.0;
            v.y = -from.z;
            v.z = from.y;
          }
        }
        else {
          v = cross(from, to);
        }
        
        return normalize(vec4(v.xyz, r));
      }
      `
    ],
    vertexPosition: `
      // float l = position.y;
      // float frc = l / hairLength;
      // vec3 totalForce = globalForce * flex;
      // totalForce *= 0.95 + 0.05 - (sin(settleTime + settleOffset) * 0.05 * settleScale);
      // totalForce += baseDirection * centrifugalAxis * centrifugalForce;
      // vec3 from = baseDirection;
      // vec3 to = normalize(baseDirection + totalForce * frc);
      // vec4 quat = quatFromUnitVectors(UP, to);
      // transformed = rotateVector(quat, transformed);

      vec3 totalForce = globalForce * flex;
      totalForce *= 0.95 + 0.05 - (sin(settleTime + settleOffset) * 0.05 * settleScale);
      totalForce += baseDirection * centrifugalAxis * centrifugalForce;
      

      vec3 result;

      vec3 to = normalize(baseDirection + totalForce * position.y / HAIR_LENGTH);
      vec4 q = quatFromUnitVectors(UP, to);
      vec3 v = vec3(position.x, 0.0, position.z);

      result += rotateVector(q, v);

      for (float i = 0.0; i < HAIR_LENGTH; i += SEGMENT_STEP) {
        if (position.y <= i) break;

        vec3 to = normalize(baseDirection + totalForce * i * FORCE_STEP);
        vec4 q = quatFromUnitVectors(UP, to);
        vec3 v = vec3(0.0, SEGMENT_STEP, 0.0);

        result += rotateVector(q, v);
      }

      transformed = result;
      transformed += hairPosition;
    `
  });

  // console.log(material.defines)

  THREE.Mesh.call(this, geometry, material);
  this.frustumCulled = false;

  const base = new THREE.Mesh(
    params.model,
    new THREE.MeshStandardMaterial({
      roughness: 1.0,
      // wireframe: true,
      // flatShading: true,
    })
  );
  this.add(base);

  // rotation stuff
  this.conjugate = new THREE.Quaternion();
  this.rotationAxis = new THREE.Vector3();
  this._angle = 0.0;
  this.previousAngle = this.angle;
  this.setRotationAxis('y');

  // position stuff
  this.previousPosition = this.position.clone();
  this.positionDelta = new THREE.Vector3();
  this.movementVelocity = new THREE.Vector3();
}

FuzzyMesh.prototype = Object.create(THREE.Mesh.prototype);
FuzzyMesh.prototype.constructor = FuzzyMesh;

Object.defineProperty(FuzzyMesh.prototype, 'pos', {
  get() {
    return this.position;
  },
  set(v) {
    this.previousPosition.copy(this.position);
    this.position.copy(v);
  }
});

Object.defineProperty(FuzzyMesh.prototype, 'angle', {
  get() {
    return this._angle;
  },
  set(v) {
    this.previousAngle = this._angle;
    this._angle = v;
  }
});

// todo: figure out which math we need to calculate centrifugal axis from rotation axis
FuzzyMesh.prototype.setRotationAxis = function(axis) {
  switch(axis) {
    case 'x':
      this.rotationAxis.set(1, 0, 0);
      this.material.uniforms.centrifugalAxis.value.set(0, 1, 1);
      break;
    case 'y':
      this.rotationAxis.set(0, 1, 0);
      this.material.uniforms.centrifugalAxis.value.set(1, 0, 1);
      break;
    case 'z':
      this.rotationAxis.set(0, 0, 1);
      this.material.uniforms.centrifugalAxis.value.set(1, 1, 0);
      break;
  }
};

FuzzyMesh.prototype.update = function() {
  // apply movement force
  this.positionDelta.copy(this.previousPosition).sub(this.position);

  this.movementVelocity.multiplyScalar(this.config.movementDecay);
  this.movementVelocity.x += this.positionDelta.x * this.config.movementForceFactor;
  this.movementVelocity.y += this.positionDelta.y * this.config.movementForceFactor;
  this.movementVelocity.z += this.positionDelta.z * this.config.movementForceFactor;

  this.material.uniforms.globalForce.value.set(
    this.movementVelocity.x,
    this.movementVelocity.y - this.config.gravity,
    this.movementVelocity.z
  );

  this.previousPosition.copy(this.position);

  // apply centrifugal force
  const rotationSpeed = Math.abs(this.previousAngle - this.angle) % (Math.PI * 2);
  this.material.uniforms.centrifugalForce.value *= this.config.centrifugalDecay;
  this.material.uniforms.centrifugalForce.value += rotationSpeed * this.config.centrifugalForceFactor;

  this.previousAngle = this.angle;

  // adjust global force based on rotation
  this.conjugate.copy(this.quaternion).conjugate();
  this.material.uniforms.globalForce.value.applyQuaternion(this.conjugate);

  // apply rotation to object
  this.quaternion.setFromAxisAngle(this.rotationAxis, this.angle);

  // rest / settle values
  this.material.uniforms.settleTime.value += (1/10);
  this.material.uniforms.settleScale.value *= this.config.settleDecay;
  this.material.uniforms.settleScale.value += (this.movementVelocity.length() + rotationSpeed) * 0.1;
  this.material.uniforms.settleScale.value > 1.0 && (this.material.uniforms.settleScale.value = 1.0);
  // console.log(this.movementVelocity.length());
};

const colors = {
  turquoise: 0x47debd,
  darkPurple: 0x2e044e,
  purple: 0x7821ec,
  yellow: 0xfff95d,
  white: 0xffffff,
  black: 0x000000
};

const root = new THREERoot({
  createCameraControls: true,
  zNear: 0.01,
  zFar: 1000
});

root.renderer.shadowMap.enabled = true;
root.renderer.setClearColor(colors.darkPurple);
root.camera.position.set(-10, 0, 20);
// root.controls.target.set(0, 3, 0);
// root.controls.autoRotate = true;

const light = new THREE.DirectionalLight(colors.turquoise);
light.position.set(0.125, 1, 0);
root.add(light);

const light2 = new THREE.DirectionalLight(colors.yellow);
light2.position.set(-0.125, -1, 0);
root.add(light2);

root.add(new THREE.AmbientLight(colors.purple));

root.add(new THREE.AxisHelper(10));

new THREE.JSONLoader().load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/304639/plus.json', (model) => {
  // test shapes, try different ones :D
  // model = new THREE.SphereGeometry(4, 256, 128);
  // model = new THREE.PlaneGeometry(16, 16, 2, 2);
  // model = new THREE.CylinderGeometry(2, 2, 8, 128, 64, true);
  model = new THREE.TorusGeometry(8, 1, 128, 512);
  // model = new THREE.TorusKnotGeometry(2, 0.1, 64, 64, 3, 5);



  // model.rotateX(Math.PI * -0.4);



  // const g = new THREE.SphereGeometry(1, 12, 12);
  // const m = new THREE.MeshBasicMaterial({
  //   color: 0xff0000,
  //   wireframe: true,
  // });
  //
  // model.vertices.forEach((v) => {
  //   const obj = new THREE.Mesh(g, m);
  //   obj.position.copy(v);
  //   root.add(obj);
  // });



  const fuzzy = new FuzzyMesh({
    model: model,
    config: {}
  });
  root.add(fuzzy);
  root.addUpdateCallback(() => {
    fuzzy.update();
  });



  const axes = ['x', 'y', 'z'];
  const p = new THREE.Vector3();
  const tl = new TimelineMax({
    repeat: -1,
    delay: 1,
    repeatDelay: 0.5,
    onRepeat: () => {
      fuzzy.angle = 0;
    fuzzy.setRotationAxis(axes[Math.random() * 3 | 0]);
    },
    onUpdate: () => {
      fuzzy.pos = p;
    }
  });

  tl.to(p, 0.5, {y: 16, ease: Power2.easeOut});
  tl.to(p, 0.5, {y: 0, ease: Power2.easeIn});
  tl.to(p, 0.1, {y: -4, ease: Power2.easeOut});
  tl.to(p, 0.5, {y: 0, ease: Power2.easeOut});
  tl.fromTo(fuzzy, 1.0, {angle: 0}, {angle: Math.PI * 2 * (Math.random() > 0.5 ? 1 : -1), ease: Power1.easeInOut}, 0);




  // fuzzy.setRotationAxis('x');
  // const position = new THREE.Vector3();
  // const tl = new TimelineMax({repeat: -1, yoyo: true, repeatDelay: 0});
  // tl.fromTo(position, 2, {x: -6}, {x: 6, ease: Power3.easeInOut, onUpdate: () => {
  //   fuzzy.pos = position;
  // }}, 0);
  // tl.fromTo(fuzzy, 8, {angle: Math.PI * -1}, {angle: Math.PI * 1, ease: Power1.easeInOut}, 0);

});
