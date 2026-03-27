import axiosInstance from '../axios'

export const authService = {
    async getNonce(address: string): Promise<string> {
        const response = await axiosInstance.get(`/v1/auth/nonce/${address}`)
        return response.data.nonce
    },

    async verifySignature(address: string, message: string, signature: string) {
        const response = await axiosInstance.post('/v1/auth/verify', {
            address,
            message,
            signature,
        })
        return response.data
    },

    setToken(token: string) {
        localStorage.setItem('auth_token', token)
        window.dispatchEvent(new Event('auth_changed'))
    },

    getToken(): string | null {
        return localStorage.getItem('auth_token')
    },

    removeToken() {
        localStorage.removeItem('auth_token')
        window.dispatchEvent(new Event('auth_changed'))
    },

    setUser(user: any) {
        localStorage.setItem('auth_user', JSON.stringify(user))
    },

    getUser(): any {
        const user = localStorage.getItem('auth_user')
        return user ? JSON.parse(user) : null
    },

    isTokenValid(): boolean {
        const token = this.getToken()
        if (!token) return false
        try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            // exp is in seconds
            return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()
        } catch {
            return false
        }
    },

    clear() {
        this.removeToken()
        localStorage.removeItem('auth_user')
    }
}
