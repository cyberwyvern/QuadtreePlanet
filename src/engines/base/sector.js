import { Matrix4, Mesh, MeshBasicMaterial, Object3D, PlaneBufferGeometry, Vector3 } from 'three';
import { SectorTransform } from '../../core/sector-transform';

const density = 8; //must be power of 2
const material = new MeshBasicMaterial({ color: 0xffffff, wireframe: true });

export class Sector {
  _address = null;
  _center = null;
  _mesh = null;
  _sphereRadius = null;

  get _density() { return density; }
  get _material() { return material; }

  /**
   * @type {number[]}
   */
  get address() { return this._address; }

  /**
   * @type {Vector3}
   */
  get center() {
    if (!this._center) {
      this._center = this._calculateCenter();
    }

    return this._center;
  }

  /**
   * @type {boolean}
   */
  get visible() { return this._mesh?.visible; }
  set visible(value) {
    if (this._mesh) {
      this._mesh.visible = value;
    }
  }

  /**
   * @param {number[]} address 
   * @param {number} sphereRadius 
   */
  constructor(address, sphereRadius) {
    this._address = address;
    this._sphereRadius = sphereRadius;
  }

  /**
   * instantiates the sector in 3D space and performs the initial transformation
   * @param {Object3D} attractor 
   */
  instantiate(attractor) {
    let geometry = new PlaneBufferGeometry(2, 2, this._density, this._density);
    this._mesh = new Mesh(geometry, this._material);

    attractor.add(this._mesh);

    //place sector on the cube
    let rawMatrix = SectorTransform.calculateTransformationMatrix(this.address, this._sphereRadius);
    let transformationMatrix = new Matrix4().set(...rawMatrix);
    this._mesh.geometry.applyMatrix4(transformationMatrix);
    
    //then spherize
    this._spherize();

    if (this.address.length > 1) {
      this._glueEdges();
    }
  }

  /**
   * removes this sector from attractor
   * @param {Object3D} attractor 
   */
  detach(attractor) {
    attractor.remove(this._mesh);
  }

  _calculateCenter() {
    let vertices = this._mesh.geometry.attributes.position.array;
    let mid = Math.round((vertices.length - 1) / 2);
    return new Vector3(vertices[mid - 1], vertices[mid], vertices[mid + 1])
      .normalize()
      .multiplyScalar(this._sphereRadius);
  }

  /**
   * key method that turns a cube into a sphere
   * (moves each vertex to be the same distance from the center)
   */
  _spherize() {
    let vertices = this._mesh.geometry.attributes.position.array;

    for (let i = 0; i < vertices.length; i += 3) {
      let vx = vertices[i];
      let vy = vertices[i + 1];
      let vz = vertices[i + 2];

      let factor = this._sphereRadius / Math.sqrt(vx * vx + vy * vy + vz * vz);

      vertices[i] *= factor;
      vertices[i + 1] *= factor;
      vertices[i + 2] *= factor;
    }
  }

  /**
   * makes sector suitable for docking with higher-level sectors
   * i.e. decreases density on edges
   */
  _glueEdges() {
    let n = this._density + 1; //sector grid dimension
    let quadrantNumber = this.address[this.address.length - 1];

    if (quadrantNumber == 0 || quadrantNumber == 1) {
      for (let x = 1, y = 0; x < n; x += 2) {
        this._mergeVertices(n * y + x, n * y + x - 1);
      }
    }

    if (quadrantNumber == 1 || quadrantNumber == 3) {
      for (let x = n - 1, y = 1; y < n; y += 2) {
        this._mergeVertices(n * y + x, n * (y + 1) + x);
      }
    }

    if (quadrantNumber == 3 || quadrantNumber == 2) {
      for (let x = n - 2, y = n - 1; x >= 0; x -= 2) {
        this._mergeVertices(n * y + x, n * y + x + 1);
      }
    }

    if (quadrantNumber == 2 || quadrantNumber == 0) {
      for (let x = 0, y = n - 2; y >= 0; y -= 2) {
        this._mergeVertices(n * y + x, n * (y - 1) + x);
      }
    }
  }

  /**
   * set vertex1 position same as vertex2 position
   * @param {number} v1Number
   * @param {number} v2Number
   */
  _mergeVertices(v1Number, v2Number) {
    let vertices = this._mesh.geometry.attributes.position.array;

    vertices[v1Number * 3] = vertices[v2Number * 3];
    vertices[v1Number * 3 + 1] = vertices[v2Number * 3 + 1];
    vertices[v1Number * 3 + 2] = vertices[v2Number * 3 + 2];
  }
}