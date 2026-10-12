const appName = "Prospectra";


const authMode = {
    login: "login",
    signup: "signup",
}

type AuthMode = typeof authMode[keyof typeof authMode];

export { appName, authMode };
export type { AuthMode };