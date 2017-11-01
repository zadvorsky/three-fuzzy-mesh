// THREE.ShapeUtils.triangulateShape = (function() {
//   var pnlTriangulator = new PNLTRI.Triangulator();
//   return function triangulateShape(contour, holes) {
//     return pnlTriangulator.triangulate_polygon([contour].concat(holes));
//   };
// })();


THREE.ShapeUtils.triangulateShape = function ( contour, holes ) {
  function removeDupEndPts( points ) {
    var l = points.length;
    if ( l > 2 && points[ l - 1 ].equals( points[ 0 ] ) ) {
      points.pop();
    }
  }
  function addContour( vertices, contour ) {
    for ( var i = 0; i < contour.length; i ++ ) {
      vertices.push( contour[ i ].x );
      vertices.push( contour[ i ].y );
    }
  }
  removeDupEndPts( contour );
  holes.forEach( removeDupEndPts );
  var vertices = [];
  addContour( vertices, contour );
  var holeIndices = [];
  var holeIndex = contour.length;
  for ( i = 0; i < holes.length; i ++ ) {
    holeIndices.push( holeIndex );
    holeIndex += holes[ i ].length;
    addContour( vertices, holes[ i ] );
  }
  var result = earcut( vertices, holeIndices, 2 );
  var grouped = [];
  for ( var i = 0; i < result.length; i += 3 ) {
    grouped.push( result.slice( i, i + 3 ) );
  }
  return grouped;
};


// scene stuff

const root = new THREERoot({
  createCameraControls: true,
  zNear: 0.01,
  zFar: 1000,
  antialias: true
});

root.renderer.setClearColor(0x000000);
// root.controls.autoRotate = true;
// root.controls.autoRotateSpeed = -6;
root.camera.position.set(0, 0, 60);
root.scene.fog = new THREE.FogExp2(0xf1f1f1, 0.001);

const light = new THREE.DirectionalLight(0xffffff, 4);
light.position.set(0, 1, 1);
root.add(light);

const light2 = new THREE.DirectionalLight(0xffffff, 4);
light2.position.set(0, 1, -1);
root.add(light2);

// root.add(new THREE.AmbientLight(0xaaaaaa));

// const floor = new THREE.Mesh(
//   new THREE.PlaneGeometry(400, 400),
//   new THREE.MeshBasicMaterial({
//     color: 0xcccccc
//   })
// );
// floor.position.y = -8;
// floor.rotation.x = -Math.PI * 0.5;
// root.add(floor);


// text stuff
const string = 'CODEVEMBER';
const fontUrl = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/175711/droid_sans_bold.typeface.js';
const fontParams = {
  size: 12,
  height: 1,
  curveSegments: 1,

  bevelEnabled: false,
  bevelThickness: 1,
  bevelSize: 1,
  material: 0,
  extrudeMaterial: 0,

  letterSpacing: 200
};

new THREE.FontLoader().load(fontUrl, (font) => {
  const letterMeshes = string.split('').map((letter) => {
    return createLetterMesh(letter, font);
  });

  const letterGroup = new THREE.Group();
  root.add(letterGroup);

  let offsetX = 0;
  letterMeshes.forEach((mesh, i) => {
    letterGroup.add(mesh);

    mesh.position.x = offsetX;
    offsetX += mesh.userData.ha;

    mesh.setColor(new THREE.Color().setHSL(i / letterMeshes.length, 0.75, 0.5));
  });

  const bounds = new THREE.Box3();

  bounds.setFromObject(letterGroup);

  const size = bounds.getSize();

  letterGroup.position.x = -size.x * 0.5;

  const v = new THREE.Vector3();
  let t = 0;

  root.addUpdateCallback(() => {
    letterGroup.children.forEach((child, i) => {
      v.copy(child.position);
      v.y = (Math.sin(t + i * 0.5)) * 4;

      child.setPosition(v);
      child.update();

      t += (1/60);
    });
  });
});

function createLetterMesh(char, font) {
  const geometry = new THREE.TextGeometry(char, {
    font,
    ...fontParams
  });

  // const modifier = new THREE.SubdivisionModifier(2);
  // modifier.modify(geometry);

  const modifier = new THREE.TessellateModifier(1);
  for (let i = 0; i < 6; i++) {
    modifier.modify(geometry);
  }

  // const material = new THREE.MeshStandardMaterial({
  //   color: 0xff00ff,
  //   wireframe: true
  // });
  // const mesh = new THREE.Mesh(geometry, material);


  const mesh = new FuzzyMesh({
    geometry,
    config: {
      hairLength: 4,
      hairRadiusBase: 0.25,
      hairRadialSegments: 4,
      fuzz: 2,
      gravity: 6,
      minForceFactor: 1.0,
      maxForceFactor: 2.0,
      movementForceFactor: 2.0
    },
    materialUniformValues: {
      roughness: 1.0
    }
  });

  const scale = fontParams.size / font.data.resolution;
  const glyph = font.data.glyphs[char];

  mesh.userData.ha = glyph.ha * scale + fontParams.letterSpacing * scale;

  return mesh;
}
