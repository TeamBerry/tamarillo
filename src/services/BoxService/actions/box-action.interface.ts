export interface BoxAction {
    getName(): string

    /**
     * Executes an action on a element of a box
     *
     * @param {string} boxToken The box
     * @param {string} target The target of the box. Can be anything
     * @memberof BoxAction
     */
    execute(boxToken: string, target: string): Promise<string>
}
