export const removeEmptyInObj = (obj: object) => {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null && v !== '' && v !== undefined));
}
export const nullify = (str?: any) => {
    if (str == undefined || str == null || (typeof str == 'string' && str.trim() == '')) {
        return null;
    }
    return str;
}
export const validatePhone = (phone: string): boolean => {
    return /^(\+2510|\+251|251|0)?(9|7)\d{8}$/.test(phone) || /^(011)\d{7}$/.test(phone) || /^(\+25111)\d{7}$/.test(phone);
}
export const formatPhone = (phone: string): string => {
    if (/^(\+2510|\+251|251|0)?(9|7)\d{8}$/.test(phone)) {
        phone = phone.startsWith('251') ? phone.substring(3) : phone;
        phone = phone.startsWith('+251') ? phone.substring(4): phone;
        phone = phone.startsWith('09') ? phone.substring(1) : phone;
        phone = phone.startsWith('07') ?  phone.substring(1) : phone;
        return parseInt(phone).toString();
    } else if (/^(\+25111|25111)\d{7}$/.test(phone)) {
        phone = phone.startsWith('+25111') ? phone.substring(4): phone;
        phone = phone.startsWith('25111') ? phone.substring(3): phone;
        return `0${parseInt(phone)}`;
    }else {
        return phone;
    }
}