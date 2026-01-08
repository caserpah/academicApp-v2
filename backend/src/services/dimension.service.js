import { dimensionRepository } from "../repositories/dimension.repository.js";

export const dimensionService = {
    async list() {
        return dimensionRepository.findAll();
    }
};