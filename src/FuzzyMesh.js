/**
 * Create a fuzzy mesh!
 * @param params
 * @constructor
 */
function FuzzyMesh(params) {
  const config = this.config = {
    recursiveRotation: true,
    hairLength: 1,
    hairRadialSegments: 3,
    hairHeightSegments: 16,
    hairRadiusTop: 0.0,
    hairRadiusBase: 0.1,
    minForceFactor: 1.0,
    maxForceFactor: 1.0,
    fuzz: 0.25,
    gravity: 1.0,
    centrifugalForceFactor: 1,
    centrifugalDecay: 0.8,
    movementForceFactor: 0.75,
    movementDecay: 0.7,
    settleDecay: 0.97, // should always be higher than movementDecay and centrifugal decay
    ...params.config
  };
  const materialUniformValues = {
    metalness: 0.5,
    roughness: 0.5,
    ...params.materialUniformValues
  };
  const positions = params.geometry.vertices;

  // create a cone prefab for pointy hair
  // create a cylinder prefab for non-pointy hair
  let prefab;

  if (config.hairRadiusTop === 0) {
    prefab = new THREE.ConeGeometry(
      config.hairRadiusBase,
      config.hairLength,
      config.hairRadialSegments,
      config.hairHeightSegments,
      true
    );
  }
  else {
    prefab = new THREE.CylinderGeometry(
      config.hairRadiusTop,
      config.hairRadiusBase,
      config.hairLength,
      config.hairRadialSegments,
      config.hairHeightSegments,
      false
    );
  }
  // cone and cylinder geometries are created around the center
  // translate them so the vertices start at y=0 and move up
  prefab.translate(0, config.hairLength * 0.5, 0);

  // create a geometry with 1 prefab per vertex of the supplied geometry
  const geometry = new BAS.PrefabBufferGeometry(prefab, positions.length);

  // forceFactor is a scalar that multiplies the total force affecting the vertex
  geometry.createAttribute('forceFactor', 1, (data) => {
    data[0] = THREE.Math.randFloat(config.minForceFactor, config.maxForceFactor);
  });

  // settleOffset is used to make sure the hair don't stop moving at the same time
  geometry.createAttribute('settleOffset', 1, (data) => {
    data[0] = THREE.Math.randFloat(0, Math.PI * 2);
  });

  // hair positions based on model vertices
  geometry.createAttribute('hairPosition', 3, (data, i) => {
    positions[i].toArray(data);
  });

  // hair directions
  let directions;

  if (params.directions) {
    directions = params.directions;
  }
  // if params.directions is not set, we use vertex normals instead
  else {
    directions = [];

    params.geometry.computeVertexNormals();

    // get a flat array of vertex normals
    for (let i = 0; i < params.geometry.faces.length; i++) {
      const face = params.geometry.faces[i];

      directions[face.a] = face.vertexNormals[0];
      directions[face.b] = face.vertexNormals[1];
      directions[face.c] = face.vertexNormals[2];
    }
  }

  // base hair directions (which direction the hair goes with no force applied to it)
  const direction = new THREE.Vector3();

  geometry.createAttribute('baseDirection', 3, (data, i) => {
    direction.copy(directions[i]);
    direction.x += THREE.Math.randFloatSpread(config.fuzz);
    direction.y += THREE.Math.randFloatSpread(config.fuzz);
    direction.z += THREE.Math.randFloatSpread(config.fuzz);
    direction.normalize();
    direction.toArray(data);
  });

  const simpleShader = `
    float f = position.y / HAIR_LENGTH;
    
    vec3 totalForce = globalForce;
    
    totalForce *= 1.0 - (sin(settleTime + settleOffset) * 0.05 * settleScale);
    totalForce += hairPosition * centrifugalDirection * centrifugalForce;
    totalForce *= forceFactor;
    
    vec3 to = normalize(baseDirection + totalForce * f);
    vec4 quat = quatFromUnitVectors(UP, to);
    
    transformed = rotateVector(quat, transformed) + hairPosition;
  `;

  const recursiveShader = `
    // accumulator for total force
    vec3 totalForce = globalForce;
    // add a little offset so the hairs don't all stop moving at the same time
    // settleScale is increased when forces are applied, then gradually goes back to zero
    totalForce *= 1.0 - (sin(settleTime + settleOffset) * 0.05 * settleScale);
    // add force based on rotation
    totalForce += hairPosition * centrifugalDirection * centrifugalForce;
    // scale force based on a magic number!
    totalForce *= forceFactor;
    
    // accumulator for position
    vec3 finalPosition;
    // get height fraction between 0.0 and 1.0
    float f = position.y / HAIR_LENGTH;
    // determine target position based on force and height fraction
    vec3 to = normalize(baseDirection + totalForce * f);
    // calculate quaterion needed to rotate UP to target rotation
    vec4 q = quatFromUnitVectors(UP, to);
    // only apply this rotation to position x and z
    // position y will be calculated in the loop below
    vec3 v = vec3(position.x, 0.0, position.z);
  
    finalPosition += rotateVector(q, v);
    
    // recursively calculate rotations using the same approach as above
    for (float i = 0.0; i < HAIR_LENGTH; i += SEGMENT_STEP) {
      if (position.y <= i) break;
  
      float f = i * FORCE_STEP;
      vec3 to = normalize(baseDirection + totalForce * f);
      vec4 q = quatFromUnitVectors(UP, to);
      // apply this rotation to a 'segment'
      vec3 v = vec3(0.0, SEGMENT_STEP, 0.0);
      // all segments leading up to the Y position are added to the final position
      finalPosition += rotateVector(q, v);
    }
  
    transformed = finalPosition + hairPosition;
  `;

  const material = new BAS.StandardAnimationMaterial({
    flatShading: true,
    wireframe: false,
    uniformValues: materialUniformValues,
    uniforms: {
      hairLength: {value: config.hairLength},
      settleTime: {value: 0.0},
      settleScale: {value: 1.0},
      globalForce: {value: new THREE.Vector3(0.0, -config.gravity, 0.0)},
      centrifugalForce: {value: 0.0},
      centrifugalDirection: {value: new THREE.Vector3(1, 0, 1).normalize()}
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
      uniform vec3 centrifugalDirection;
      uniform float settleTime;
      uniform float settleScale;
      
      attribute float forceFactor;
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
    vertexPosition: config.recursiveRotation ? recursiveShader : simpleShader
  });

  THREE.Mesh.call(this, geometry, material);

  // since the bounding box for the hair is never updated,
  // set frustumCulled to false so the object doesn't disappear suddenly
  this.frustumCulled = false;
  // add the base geometry to self
  this.baseMesh = new THREE.Mesh(
    params.geometry,
    new THREE.MeshStandardMaterial(materialUniformValues)
  );
  this.add(this.baseMesh);

  // rotation stuff
  this._quat = new THREE.Quaternion();
  this.conjugate = new THREE.Quaternion();
  this.rotationAxis = new THREE.Vector3(0, 1, 0);
  this.angle = 0.0;
  this.previousAngle = this.angle;

  // position stuff
  this.previousPosition = this.position.clone();
  this.positionDelta = new THREE.Vector3();
  this.movementForce = new THREE.Vector3();
}

FuzzyMesh.prototype = Object.create(THREE.Mesh.prototype);
FuzzyMesh.prototype.constructor = FuzzyMesh;

FuzzyMesh.prototype.setColor = function(color) {
  this.baseMesh.material.color.set(color);
  this.material.uniforms.diffuse.value.set(color);
};

FuzzyMesh.prototype.setPosition = function(position) {
  this.previousPosition.copy(this.position);
  this.position.copy(position);
};

FuzzyMesh.prototype.setRotationAngle = function(angle) {
  this.previousAngle = this.angle;
  this.angle = angle;
};

FuzzyMesh.prototype.setRotationAxis = function(axis) {
  this.setRotationAngle(0);

  const ra = this.rotationAxis;
  const cd = this.material.uniforms.centrifugalDirection.value;
  const q = this._quat;

  // reset rotation axis and centrifugal direction;
  ra.set(0, 1, 0);
  cd.set(1, 0, 1);

  // get angle between default rotation axis and target rotation axis
  q.setFromUnitVectors(ra, axis);
  // apply angle to centrifugal direction
  cd.applyQuaternion(q);
  // normalize the angle, and make the values absolute
  cd.normalize();
  cd.x = Math.abs(cd.x);
  cd.y = Math.abs(cd.y);
  cd.z = Math.abs(cd.z);
  // finally don't forget to update the rotation axis
  ra.copy(axis);
};

FuzzyMesh.prototype.update = function() {
  // apply movement force
  this.positionDelta.copy(this.previousPosition).sub(this.position);

  this.movementForce.multiplyScalar(this.config.movementDecay);
  this.movementForce.x += this.positionDelta.x * this.config.movementForceFactor;
  this.movementForce.y += this.positionDelta.y * this.config.movementForceFactor;
  this.movementForce.z += this.positionDelta.z * this.config.movementForceFactor;

  this.material.uniforms.globalForce.value.set(
    this.movementForce.x,
    this.movementForce.y - this.config.gravity,
    this.movementForce.z
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
  this.material.uniforms.settleScale.value += (this.movementForce.length() + rotationSpeed) * 0.1;
  this.material.uniforms.settleScale.value > 1.0 && (this.material.uniforms.settleScale.value = 1.0);
};
