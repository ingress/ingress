import * as api from './main'

describe('Ingress', () => {
  describe('Exports', () => {
    it('define the default export', () => {
      expect(typeof api.default).toBe('function')
    })
    it('should define the Route annotation', () => {
      expect(typeof api.Route).toBe('function')
    })

    it('should define the Ingress Class', () => {
      expect(typeof api.Ingress).toBe('function')
    })
  })
})
