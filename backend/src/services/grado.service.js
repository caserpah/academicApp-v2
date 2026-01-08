import { gradoRepository } from "../repositories/grado.repository.js";

export const gradoService = {
    async list() {
        return gradoRepository.findAll();
    }
};