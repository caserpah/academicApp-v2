import { desempenoRepository } from "../repositories/desempeno.repository.js";

export const desempenoService = {
    async list() {
        return desempenoRepository.findAll();
    }
};