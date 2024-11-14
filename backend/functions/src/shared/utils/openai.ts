export const countGPTToken = (text: string) => {
    return text.split(' ').length;
};