import { FormGroup } from '@angular/forms';


export function ConditionalRequirementValidator(conditionalControlName: string, requiredControlName: string) {
    return (formGroup: FormGroup) => {
        const conditionalControl = formGroup.controls[conditionalControlName];
        const requiredControl = formGroup.controls[requiredControlName];
        if (requiredControl.errors && !requiredControl.errors.conditionalRequirementValidator) {
            return;
        }
        if (conditionalControl.value !== '' && requiredControl.value === '') {
            requiredControl.setErrors({ conditionalRequirementValidator: true });
        } else {
            requiredControl.setErrors(null);
        }
    }
}