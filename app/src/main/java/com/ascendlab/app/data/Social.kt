package com.ascendlab.app.data

import com.google.firebase.Timestamp
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import kotlin.math.abs

/** [share] is the usual slice of the day's calories for that meal (Breakfast 25%, etc.). */
enum class MealType(val label: String, val share: Double) {
    BREAKFAST("Breakfast", 0.25),
    LUNCH("Lunch", 0.35),
    DINNER("Dinner", 0.30),
    SNACK("Snacks", 0.10);

    companion object {
        /** A sensible default from the time of day. */
        fun forNow(): MealType = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
            in 4..10 -> BREAKFAST
            in 11..14 -> LUNCH
            in 18..22 -> DINNER
            else -> SNACK
        }
    }
}

/**
 * One post in the friends' feed: a logged meal, or a finished workout when [workout]
 * is set. Logging a meal is posting it: it counts toward the author's day. [target] is
 * the author's calorie goal when they posted, so standings never read private profiles.
 */
data class FeedPost(
    val id: String,
    val uid: String,
    val authorName: String,
    val dayKey: String,
    val mealType: MealType,
    val description: String,
    val calories: Int,
    val target: Int,
    /** Grams of protein; 0 when the author didn't enter it. */
    val protein: Int,
    val proteinTarget: Int,
    /** Grams of carbs and fat; 0 when not entered. */
    val carbs: Int = 0,
    val fat: Int = 0,
    /** Small JPEG, base64-encoded, or null when the meal has no photo. */
    val photo: String?,
    val likes: List<String>,
    val createdAt: Date,
    val workout: WorkoutInfo? = null,
    val commentCount: Int = 0,
) {
    val isMeal: Boolean get() = workout == null

    companion object {
        @Suppress("UNCHECKED_CAST")
        fun fromMap(id: String, m: Map<String, Any?>): FeedPost? = runCatching {
            val workout = if (m["kind"] == "workout") WorkoutInfo(
                title = m["title"] as? String ?: "Workout",
                durationSec = (m["durationSec"] as? Number)?.toInt() ?: 0,
                volumeKg = (m["volumeKg"] as? Number)?.toInt() ?: 0,
                sets = (m["sets"] as? Number)?.toInt() ?: 0,
                records = (m["records"] as? Number)?.toInt() ?: 0,
                exercises = (m["exercises"] as? List<*>)?.mapNotNull { e ->
                    (e as? Map<*, *>)?.let {
                        WorkoutLine(it["name"] as? String ?: "", (it["sets"] as? Number)?.toInt() ?: 0, it["best"] as? String ?: "")
                    }
                } ?: emptyList(),
            ) else null
            FeedPost(
                workout = workout,
                commentCount = (m["commentCount"] as? Number)?.toInt() ?: 0,
                id = id,
                uid = m["uid"] as String,
                authorName = m["authorName"] as? String ?: "Someone",
                dayKey = m["dayKey"] as String,
                mealType = MealType.entries.firstOrNull { it.name == m["mealType"] } ?: MealType.SNACK,
                description = m["description"] as? String ?: "",
                calories = (m["calories"] as? Number)?.toInt() ?: if (workout != null) 0 else error("no calories"),
                target = (m["target"] as? Number)?.toInt() ?: 0,
                protein = (m["protein"] as? Number)?.toInt() ?: 0,
                proteinTarget = (m["proteinTarget"] as? Number)?.toInt() ?: 0,
                carbs = (m["carbs"] as? Number)?.toInt() ?: 0,
                fat = (m["fat"] as? Number)?.toInt() ?: 0,
                photo = m["photo"] as? String,
                likes = m["likes"] as? List<String> ?: emptyList(),
                createdAt = (m["createdAt"] as Timestamp).toDate(),
            )
        }.getOrNull()
    }
}

/** A comment under a post: text, a photo, or both. */
data class Comment(
    val id: String,
    val uid: String,
    val authorName: String,
    val text: String,
    val photo: String?,
    val createdAt: Date,
)

/** What other people can see about someone: their name, friend code and friends. */
data class PublicProfile(
    val uid: String,
    val name: String,
    val code: String,
    val friends: List<String>,
)

/** One person's day in the friends' race to land closest to their calorie goal. */
data class Standing(
    val uid: String,
    val name: String,
    val eaten: Int,
    val target: Int,
    val meals: Int,
) {
    /** Calories over (+) or under (-) the goal. */
    val gap: Int get() = eaten - target
    val distance: Int get() = abs(gap)
}

object Days {
    private fun format() = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    fun key(date: Date = Date()): String = format().format(date)

    fun yesterday(): String = key(Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, -1) }.time)

    /** Ranks everyone who logged at least one meal on [dayKey], closest to their goal first. */
    fun standings(posts: List<FeedPost>, dayKey: String): List<Standing> =
        posts.filter { it.isMeal && it.dayKey == dayKey && it.target > 0 }
            .groupBy { it.uid }
            .map { (uid, meals) ->
                val latest = meals.maxBy { it.createdAt }
                Standing(uid, latest.authorName, meals.sumOf { it.calories }, latest.target, meals.size)
            }
            .sortedWith(compareBy({ it.distance }, { -it.meals }))
}
