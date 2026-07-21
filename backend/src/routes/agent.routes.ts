import { Router } from 'express';
import { purpleFabricService } from '../services/purpleFabric.service';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const agents = await purpleFabricService.listWorkspaceAgents();
    res.status(200).json({ success: true, data: agents });
  } catch (error) {
    next(error);
  }
});

export default router;
