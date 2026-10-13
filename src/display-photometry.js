// Display exposure preserves magnitude order, rather than claiming screen
// brightness measures calibrated apparent flux.
export function magnitudeStrength(magnitude){return Number.isFinite(magnitude)?Math.min(1.4,Math.pow(10,-.2*(magnitude-1))):.025;}
export function beltStrength(record){
 // Unknown measurements receive a subdued symbol, never an invented diameter.
 if(!(record.diameterKm>0))return .012;
 const reflectance=record.albedo>0?Math.sqrt(record.albedo/.1):1;
 return Math.min(.8,.08*Math.sqrt(record.diameterKm)*reflectance/Math.max(1,record.orbitalElements?.aAU||record.aAU||1));
}
