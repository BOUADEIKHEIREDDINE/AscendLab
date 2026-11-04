package com.ascendlab.app.data

import kotlin.math.roundToInt

/** Unit conversions. Everything is stored in metric and converted only for display and input. */
object Convert {
    private const val LB_PER_KG = 2.2046226218
    private const val CM_PER_INCH = 2.54

    fun kgToLb(kg: Double) = kg * LB_PER_KG
    fun lbToKg(lb: Double) = lb / LB_PER_KG

    /** Splits a height in cm into whole feet and inches, e.g. 178 cm -> (5, 10). */
    fun cmToFeetInches(cm: Double): Pair<Int, Int> {
        val totalInches = (cm / CM_PER_INCH).roundToInt()
        return totalInches / 12 to totalInches % 12
    }

    fun feetInchesToCm(feet: Int, inches: Int) = (feet * 12 + inches) * CM_PER_INCH

    fun formatWeight(kg: Double, units: Units): String = when (units) {
        Units.METRIC -> "${kg.roundToInt()} kg"
        Units.IMPERIAL -> "${kgToLb(kg).roundToInt()} lb"
    }

    fun formatHeight(cm: Double, units: Units): String = when (units) {
        Units.METRIC -> "${cm.roundToInt()} cm"
        Units.IMPERIAL -> cmToFeetInches(cm).let { (ft, inch) -> "$ft ft $inch in" }
    }
}

/**
 * Checks that body data is realistic before it is used to build a plan.
 * Each check returns null when the value is fine, or a short message saying what to fix.
 */
object BodyChecks {
    const val MIN_AGE = 16
    const val MAX_AGE = 100
    const val MIN_HEIGHT_CM = 120.0
    const val MAX_HEIGHT_CM = 230.0
    const val MIN_WEIGHT_KG = 35.0
    const val MAX_WEIGHT_KG = 250.0

    // A BMI outside this band almost always means a typo (or a mix-up between units).
    private const val MIN_PLAUSIBLE_BMI = 13.0
    private const val MAX_PLAUSIBLE_BMI = 70.0

    fun age(age: Int?): String? = when {
        age == null -> "Enter your age."
        age < MIN_AGE -> "AscendLab is for people aged $MIN_AGE and over."
        age > MAX_AGE -> "Please check your age: $MAX_AGE is the maximum."
        else -> null
    }

    fun height(cm: Double?, units: Units): String? = when {
        cm == null -> "Enter your height."
        cm < MIN_HEIGHT_CM || cm > MAX_HEIGHT_CM ->
            "Enter a height between ${Convert.formatHeight(MIN_HEIGHT_CM, units)} " +
                "and ${Convert.formatHeight(MAX_HEIGHT_CM, units)}."
        else -> null
    }

    fun weight(kg: Double?, units: Units): String? = when {
        kg == null -> "Enter your weight."
        kg < MIN_WEIGHT_KG || kg > MAX_WEIGHT_KG ->
            "Enter a weight between ${Convert.formatWeight(MIN_WEIGHT_KG, units)} " +
                "and ${Convert.formatWeight(MAX_WEIGHT_KG, units)}."
        else -> null
    }

    /** Height and weight can each be in range yet impossible together (e.g. 230 cm and 35 kg). */
    fun combination(heightCm: Double?, weightKg: Double?): String? {
        if (heightCm == null || weightKg == null) return null
        val meters = heightCm / 100
        val bmi = weightKg / (meters * meters)
        return if (bmi < MIN_PLAUSIBLE_BMI || bmi > MAX_PLAUSIBLE_BMI) {
            "This height and weight don't seem to go together. Please double-check both."
        } else {
            null
        }
    }
}
