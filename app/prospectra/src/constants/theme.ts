export const theme = {
    light: {
        background: "#F5F2EA",
        primary: "#1F4D3A",
        secondary: "#B85C2A",
        text: "#1A1A17",

        surface: "#FBF9F3",
        surfaceElevated: "#FFFFFF",
        border: "#DDD7C8",
        overlay: "rgba(26,26,23,0.45)",

        textSecondary: "#5C5A50",
        textDisabled: "#B5B0A0",
        placeholder: "#8F8B7C",
        onPrimary: "#F5F2EA",

        success: "#2F7D4F",
        warning: "#B7791F",
        error: "#B3392F",
        info: "#2F6F8F",

        tabBar: "#F5F2EA",
        tabActive: "#1F4D3A",
        tabInactive: "#8F8B7C",
        statusBar: "dark-content",
        icon: require("../../assets/app_icons/prospectra-dark.png"),
    },
    dark: {
        background: "#12130F",
        primary: "#7FB89A",
        secondary: "#E08A52",
        text: "#EDEAE0",

        surface: "#1A1B16",
        surfaceElevated: "#23241D",
        border: "#33342B",
        overlay: "rgba(0,0,0,0.6)",

        textSecondary: "#A9A692",
        textDisabled: "#5A594C",
        placeholder: "#7A7767",
        onPrimary: "#10201A",

        success: "#6FBF8B",
        warning: "#E0B04F",
        error: "#E07A6E",
        info: "#7DB2CC",

        tabBar: "#12130F",
        tabActive: "#7FB89A",
        tabInactive: "#7A7767",
        statusBar: "light-content",
        icon: require("../../assets/app_icons/prospectra-light.png"),
    },
};

export const tokens = {
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 },
    radius: { sm: 4, md: 8, lg: 14, full: 999 }, // mixed radii, not 16 everywhere
    fontSize: { xs: 12, sm: 14, md: 16, lg: 20, xl: 30 },
};
