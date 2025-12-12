/**
 * Camera Module Exports
 */

// Service exports
export {
  createCamera,
  getCameraById,
  getCamerasByTenant,
  updateCamera,
  deleteCamera,
  getCameraByKey,
  type CreateCameraInput,
  type UpdateCameraInput,
  type CameraResponse,
} from './service.js';

// Controller exports
export {
  createCamera as createCameraController,
  listCameras,
  getCamera,
  updateCamera as updateCameraController,
  deleteCamera as deleteCameraController,
} from './controller.js';

// Router exports
export { cameraRouter, default } from './router.js';
