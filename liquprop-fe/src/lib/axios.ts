import axios from 'axios'

const API_URL = import.meta.env.VITE_API_BASE_URL

const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
})

// Add a request interceptor to add the auth token to headers
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Add a response interceptor to handle errors
axiosInstance.interceptors.response.use(
    (response) => {
        return response.data
    },
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized (e.g., clear token and redirect to login)
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_user')
        }
        return Promise.reject(error)
    }
)

export default axiosInstance
