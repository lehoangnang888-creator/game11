import * as THREE from 'three';
import { TrackBiome } from '../types';
import { safeGetPointAt, safeGetTangentAt } from './curveUtils';

export interface GeneratedTrack {
  curve: THREE.CatmullRomCurve3;
  trackMesh: THREE.Mesh;
  curbMeshes: THREE.Mesh[];
  sceneryGroup: THREE.Group;
  totalLength: number;
}

export class TrackGenerator {
  /**
   * Generates a closed circuit path based on seed and biome
   */
  static generateTrack(seed: number, biome: TrackBiome): GeneratedTrack {
    // Generate closed circuit control points with procedural variations
    const points: THREE.Vector3[] = [];
    const controlPointCount = 14;
    const baseRadiusX = 140;
    const baseRadiusZ = 100;

    for (let i = 0; i < controlPointCount; i++) {
      const angle = (i / controlPointCount) * Math.PI * 2;
      // Controlled harmonic variations for diverse chicane, hairpins, and straights
      const noise1 = Math.sin(angle * 3 + seed) * 35;
      const noise2 = Math.cos(angle * 2 + seed * 0.5) * 25;
      const elevation = Math.sin(angle * 2 + seed) * 12 + Math.cos(angle * 4) * 4;

      const rX = baseRadiusX + noise1;
      const rZ = baseRadiusZ + noise2;

      const x = Math.cos(angle) * rX;
      const z = Math.sin(angle) * rZ;
      const y = Math.max(0, elevation);

      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
    const totalLength = curve.getLength();

    // Generate Track Ribbon Geometry (width = 14 units)
    const trackWidth = 14;
    const segments = 220;
    const trackGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = safeGetPointAt(curve, t);
      const tangent = safeGetTangentAt(curve, t);
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Left edge, Center, Right edge
      const pLeft = point.clone().addScaledVector(normal, trackWidth / 2);
      const pRight = point.clone().addScaledVector(normal, -trackWidth / 2);

      positions.push(pLeft.x, pLeft.y + 0.1, pLeft.z);
      positions.push(pRight.x, pRight.y + 0.1, pRight.z);

      normals.push(0, 1, 0);
      normals.push(0, 1, 0);

      uvs.push(0, t * 40);
      uvs.push(1, t * 40);

      if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    trackGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    trackGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    trackGeo.setIndex(indices);

    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x1e2229, // Realistic dark asphalt
      roughness: 0.65,
      metalness: 0.15,
    });

    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.receiveShadow = true;

    // Scenery items (curbs, light poles, arches, center markings)
    const sceneryGroup = new THREE.Group();
    const curbMeshes: THREE.Mesh[] = [];

    // Road Centerline Markings (dashed white lines)
    const lineSegments = 160;
    const lineGeo = new THREE.BoxGeometry(0.35, 0.05, 1.8);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
    for (let l = 0; l < lineSegments; l += 2) {
      const t = l / lineSegments;
      const point = safeGetPointAt(curve, t);
      const tangent = safeGetTangentAt(curve, t);
      const lineMesh = new THREE.Mesh(lineGeo, lineMat);
      lineMesh.position.set(point.x, point.y + 0.15, point.z);
      lineMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      sceneryGroup.add(lineMesh);
    }

    // Red & White Curbs matching Pro Circuits
    const curbSegments = 160;
    const curbGeo = new THREE.BoxGeometry(0.8, 0.25, 2.2);

    for (let c = 0; c < curbSegments; c += 2) {
      const t = c / curbSegments;
      const point = safeGetPointAt(curve, t);
      const tangent = safeGetTangentAt(curve, t);
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const isWhite = (c / 2) % 2 === 0;
      const curbMat = new THREE.MeshStandardMaterial({
        color: isWhite ? 0xffffff : 0xef4444,
        roughness: 0.5,
        metalness: 0.1
      });

      // Left curb
      const pLeft = point.clone().addScaledVector(normal, trackWidth / 2 + 0.4);
      const curbLeft = new THREE.Mesh(curbGeo, curbMat);
      curbLeft.position.set(pLeft.x, pLeft.y + 0.15, pLeft.z);
      curbLeft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      sceneryGroup.add(curbLeft);
      curbMeshes.push(curbLeft);

      // Right curb
      const pRight = point.clone().addScaledVector(normal, -trackWidth / 2 - 0.4);
      const curbRight = new THREE.Mesh(curbGeo, curbMat);
      curbRight.position.set(pRight.x, pRight.y + 0.15, pRight.z);
      curbRight.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      sceneryGroup.add(curbRight);
      curbMeshes.push(curbRight);

      // Light posts / sci-fi pylons every 16 segments
      if (c % 16 === 0) {
        const poleHeight = 10;
        const poleGeo = new THREE.CylinderGeometry(0.2, 0.3, poleHeight, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        const polePos = point.clone().addScaledVector(normal, trackWidth / 2 + 3.5);
        pole.position.set(polePos.x, polePos.y + poleHeight / 2, polePos.z);
        sceneryGroup.add(pole);

        // Lamp head
        const lampHead = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 0.3, 0.8),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        lampHead.position.set(polePos.x, polePos.y + poleHeight, polePos.z);
        sceneryGroup.add(lampHead);
      }
    }

    // Start/Finish Arch Gantry (matching Playable Racing Game)
    const startPoint = safeGetPointAt(curve, 0);
    const startTangent = safeGetTangentAt(curve, 0);
    const startNormal = new THREE.Vector3().crossVectors(startTangent, new THREE.Vector3(0, 1, 0)).normalize();

    const archGroup = new THREE.Group();
    const pillarGeo = new THREE.BoxGeometry(1.2, 10, 1.2);
    const archMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });

    const p1 = new THREE.Mesh(pillarGeo, archMat);
    p1.position.copy(startPoint).addScaledVector(startNormal, trackWidth / 2 + 1.8);
    p1.position.y += 5;

    const p2 = new THREE.Mesh(pillarGeo, archMat);
    p2.position.copy(startPoint).addScaledVector(startNormal, -trackWidth / 2 - 1.8);
    p2.position.y += 5;

    const crossbarGeo = new THREE.BoxGeometry(trackWidth + 4, 1.8, 1.8);
    const crossbar = new THREE.Mesh(crossbarGeo, new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.4 }));
    crossbar.position.copy(startPoint);
    crossbar.position.y += 10;
    crossbar.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), startNormal);

    // Start lights (5 red LEDs)
    const lightGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    for (let sl = -2; sl <= 2; sl++) {
      const slMesh = new THREE.Mesh(lightGeo, lightMat);
      slMesh.position.copy(startPoint).addScaledVector(startNormal, sl * 1.6);
      slMesh.position.y += 9.2;
      archGroup.add(slMesh);
    }

    const bannerGeo = new THREE.PlaneGeometry(trackWidth - 1, 1.4);
    const bannerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.copy(crossbar.position);
    banner.position.y -= 0.3;
    banner.lookAt(startPoint.clone().add(startTangent));

    archGroup.add(p1, p2, crossbar, banner);
    sceneryGroup.add(archGroup);

    // Ground terrain plane
    const groundGeo = new THREE.PlaneGeometry(600, 600, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: biome.groundColor,
      roughness: 0.9,
      metalness: 0.05
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.5;
    groundMesh.receiveShadow = true;
    sceneryGroup.add(groundMesh);

    return {
      curve,
      trackMesh,
      curbMeshes,
      sceneryGroup,
      totalLength
    };
  }
}
