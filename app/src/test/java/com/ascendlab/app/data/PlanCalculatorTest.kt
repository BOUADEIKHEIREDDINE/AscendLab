package com.ascendlab.app.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PlanCalculatorTest {
    private val man = UserProfile(
        sex = Sex.MAN, age = 30, heightCm = 180.0, weightKg = 80.0,
        activity = ActivityLevel.MODERATE, goal = Goal.GET_FIT, daysPerWeek = 3, place = TrainingPlace.GYM,
    )

    @Test fun `maintenance follows Mifflin-St Jeor`() {
        // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 1780; x1.55 = 2759 -> 2760
        val t = PlanCalculator.nutrition(man)
        assertEquals(1780, t.bmr)
        assertEquals(2760, t.maintenance)
        assertEquals(2760, t.calories)
    }

    @Test fun `goals shift calories by a moderate amount`() {
        assertEquals(2210, PlanCalculator.nutrition(man.copy(goal = Goal.LOSE_FAT)).calories) // 2759 * 0.8
        assertEquals(3030, PlanCalculator.nutrition(man.copy(goal = Goal.BUILD_MUSCLE)).calories) // 2759 * 1.1
    }

    @Test fun `woman formula uses the -161 offset`() {
        val t = PlanCalculator.nutrition(man.copy(sex = Sex.WOMAN))
        assertEquals(1610, t.bmr) // 1780 - 166 = 1614 -> 1610
    }

    @Test fun `fat loss never drops below the safe minimum`() {
        val small = man.copy(sex = Sex.WOMAN, age = 70, heightCm = 150.0, weightKg = 45.0,
            activity = ActivityLevel.SEDENTARY, goal = Goal.LOSE_FAT)
        assertEquals(1200, PlanCalculator.nutrition(small).calories)
    }

    @Test fun `macros add up to the calorie target`() {
        listOf(Goal.LOSE_FAT, Goal.BUILD_MUSCLE, Goal.GET_FIT).forEach { goal ->
            val t = PlanCalculator.nutrition(man.copy(goal = goal))
            val kcal = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9
            assertTrue("$goal: $kcal vs ${t.calories}", kotlin.math.abs(kcal - t.calories) <= 12)
        }
    }

    @Test fun `protein is capped for larger bodies`() {
        val heavy = PlanCalculator.nutrition(man.copy(weightKg = 160.0))
        assertEquals(140, heavy.proteinG) // 27 * 1.8² * 1.6 = 139.97 g // reference weight at BMI 27
    }

    @Test fun `split and schedule match the days chosen`() {
        for (days in 2..6) {
            val week = PlanCalculator.training(man.copy(daysPerWeek = days))
            assertEquals(days, week.days.size)
            assertEquals(days, week.days.map { it.dayIndex }.distinct().size)
            assertTrue(week.days.all { it.dayIndex in 0..6 })
        }
        assertEquals("Full body", PlanCalculator.training(man.copy(daysPerWeek = 3)).splitName)
        assertEquals("Upper / Lower", PlanCalculator.training(man.copy(daysPerWeek = 4)).splitName)
        assertEquals("Push / Pull / Legs", PlanCalculator.training(man.copy(daysPerWeek = 6)).splitName)
    }

    @Test fun `editing goals regenerates a different plan`() {
        val before = PlanCalculator.training(man)
        val after = PlanCalculator.training(man.copy(daysPerWeek = 4, goal = Goal.BUILD_MUSCLE))
        assertTrue(before != after)
    }
}

class BodyChecksTest {
    @Test fun `realistic values pass`() {
        assertNull(BodyChecks.age(30))
        assertNull(BodyChecks.height(175.0, Units.METRIC))
        assertNull(BodyChecks.weight(70.0, Units.METRIC))
        assertNull(BodyChecks.combination(175.0, 70.0))
    }

    @Test fun `unrealistic values are caught`() {
        assertNotNull(BodyChecks.age(null))
        assertNotNull(BodyChecks.age(12))
        assertNotNull(BodyChecks.age(140))
        assertNotNull(BodyChecks.height(17.5, Units.METRIC)) // typed in the wrong unit
        assertNotNull(BodyChecks.height(300.0, Units.METRIC))
        assertNotNull(BodyChecks.weight(20.0, Units.METRIC))
        assertNotNull(BodyChecks.weight(400.0, Units.IMPERIAL))
        assertNotNull(BodyChecks.combination(225.0, 40.0)) // each fine alone, impossible together
    }

    @Test fun `messages use the chosen units`() {
        assertTrue(BodyChecks.weight(10.0, Units.IMPERIAL)!!.contains("lb"))
        assertTrue(BodyChecks.height(10.0, Units.IMPERIAL)!!.contains("ft"))
    }

    @Test fun `unit conversions round-trip`() {
        assertEquals(5 to 10, Convert.cmToFeetInches(178.0))
        assertEquals(177.8, Convert.feetInchesToCm(5, 10), 0.01)
        assertEquals(80.0, Convert.lbToKg(Convert.kgToLb(80.0)), 1e-9)
        assertEquals("176 lb", Convert.formatWeight(80.0, Units.IMPERIAL))
    }

    @Test fun `profile survives a save and load`() {
        val p = UserProfile(Sex.WOMAN, 28, 165.0, 60.0, ActivityLevel.LIGHT, Goal.LOSE_FAT, 3,
            TrainingPlace.HOME, Units.IMPERIAL, onboardingComplete = true)
        assertEquals(p, UserProfile.fromMap(p.toMap()))
        assertEquals(UserProfile(), UserProfile.fromMap(mapOf("sex" to "ALIEN")))
    }
}
