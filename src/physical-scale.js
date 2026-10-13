// One physical length scale for every catalogue and every close-up.
// Changing a camera or its origin must never change these conversions.
export const EARTH_RADIUS_KM=6371;
export const AU_KM=149597870.7;
export const LIGHT_YEAR_KM=9460730472580.8;
export const SOLAR_NOMINAL_RADIUS_KM=695700; // IAU 2015 B3, exact conversion.
export const AU_UNITS=AU_KM/EARTH_RADIUS_KM;
export const LY_UNITS=LIGHT_YEAR_KM/EARTH_RADIUS_KM;
export const SOLAR_RADIUS_EARTH=SOLAR_NOMINAL_RADIUS_KM/EARTH_RADIUS_KM;
export const MAX_VIEW_DISTANCE=5e10*LY_UNITS;
export const SOLAR_OVERVIEW_DISTANCE=72*AU_UNITS;
export const SOLAR_LABEL_LIMIT=160*AU_UNITS;
export const kmUnits=km=>km/EARTH_RADIUS_KM;
export const auUnits=au=>au*AU_UNITS;
export function distanceText(units){
 const km=units*EARTH_RADIUS_KM;
 return units>LY_UNITS*.01?`${(units/LY_UNITS).toLocaleString('zh-CN',{maximumSignificantDigits:4})} 光年`:units>AU_UNITS*.02?`${(units/AU_UNITS).toLocaleString('zh-CN',{maximumSignificantDigits:4})} AU`:`${km.toLocaleString('zh-CN',{maximumSignificantDigits:5})} km`;
}
export function beltOpacity(radius,focusDistance,extent){
 // Pixel symbols are visibility aids. They do not express body diameters or
 // calibrated brightness. Fade in screen scale, not an arbitrary world range.
 if(focusDistance>extent*6||radius<10)return 0;
 const far=Math.max(extent*28,300*AU_UNITS);
 return .78*Math.min(1,radius/100)*Math.max(0,Math.min(1,(far-radius)/(far-extent*10)));
}
