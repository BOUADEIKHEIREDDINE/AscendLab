package com.ascendlab.app.ui.screens.home

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.AddBox
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.PersonAdd
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.ascendlab.app.R
import com.ascendlab.app.data.Days
import com.ascendlab.app.data.FeedPost
import com.ascendlab.app.data.ProfileRepository
import com.ascendlab.app.data.SocialRepository
import com.ascendlab.app.ui.components.Avatar
import com.ascendlab.app.ui.components.Gutter
import com.ascendlab.app.ui.components.Hairline
import com.ascendlab.app.ui.components.PostCard
import com.ascendlab.app.ui.components.RaceCard
import com.ascendlab.app.ui.components.SkeletonCard
import com.ascendlab.app.ui.components.pressable
import com.ascendlab.app.ui.navigation.Routes
import com.ascendlab.app.ui.theme.Apricot

private const val DAY_MS = 24L * 3600 * 1000

/** Someone in the stories row: their posts from the last 24 hours and how their day is going. */
private data class StoryPerson(val uid: String, val name: String, val posts: List<FeedPost>, val eaten: Int, val target: Int, val avatarName: String = name)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(navController: NavHostController, vm: FeedViewModel = viewModel()) {
    val feed by vm.feed.collectAsStateWithLifecycle()
    val me by vm.me.collectAsState()
    ProfileRepository.profile.collectAsState().value // recompose when the goal changes
    val myUid = me?.uid ?: SocialRepository.uid
    val today = Days.key()
    val standings = remember(feed.posts, today) { Days.standings(feed.posts, today) }
    val yesterday = remember(feed.posts) { Days.standings(feed.posts, Days.yesterday()) }
    val seen by StorySeen.ids.collectAsState()
    var raceOpen by remember { mutableStateOf(false) }
    val myTarget = vm.target()

    // Stories: you first, then friends who posted in the last 24 hours, most recent first.
    val stories = remember(feed.posts, myUid, myTarget, me?.name) {
        val cutoff = System.currentTimeMillis() - DAY_MS
        val byUid = feed.posts.filter { it.createdAt.time >= cutoff }.groupBy { it.uid }
        val mine = myUid?.let { id ->
            val todayMeals = feed.posts.filter { it.uid == id && it.isMeal && it.dayKey == today }
            StoryPerson(id, "Your story", byUid[id].orEmpty().sortedBy { it.createdAt }, todayMeals.sumOf { it.calories }, myTarget, me?.name ?: "You")
        }
        val others = byUid.filterKeys { it != myUid }.map { (uid, posts) ->
            val todayMeals = posts.filter { it.isMeal && it.dayKey == today }
            StoryPerson(uid, posts.first().authorName, posts.sortedBy { it.createdAt }, todayMeals.sumOf { it.calories }, posts.maxOf { it.target })
        }.sortedByDescending { p -> p.posts.maxOf { it.createdAt } }
        listOfNotNull(mine) + others
    }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
        item {
            Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 4.dp, top = 10.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Image(painterResource(R.drawable.ascendlab_logo), contentDescription = "AscendLab", modifier = Modifier.height(26.dp))
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { navController.navigate(Routes.CREATE_POST) }) {
                    Icon(Icons.Outlined.AddBox, "Log a meal", modifier = Modifier.size(26.dp))
                }
                IconButton(onClick = { raceOpen = true }) {
                    Icon(Icons.Outlined.EmojiEvents, "Today's race", modifier = Modifier.size(26.dp))
                }
                IconButton(onClick = { navController.navigate(Routes.FRIENDS) }) {
                    Icon(Icons.Outlined.PersonAdd, "Friends", modifier = Modifier.size(26.dp))
                }
            }
        }

        item {
            LazyRow(contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                items(stories, key = { it.uid }) { p ->
                    StoryBubble(
                        person = p,
                        isMe = p.uid == myUid,
                        allSeen = p.posts.isNotEmpty() && p.posts.all { it.id in seen },
                        onClick = {
                            if (p.posts.isEmpty()) navController.navigate(Routes.CREATE_POST)
                            else navController.navigate(Routes.story(p.uid))
                        },
                        onAdd = { navController.navigate(Routes.CREATE_POST) },
                    )
                }
            }
            Hairline(Modifier.padding(top = 4.dp))
        }

        if (me != null && me?.friends.isNullOrEmpty()) {
            item {
                Row(
                    Modifier.fillMaxWidth().pressable { navController.navigate(Routes.FRIENDS) }.padding(horizontal = Gutter, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Outlined.PersonAdd, null, tint = MaterialTheme.colorScheme.primary)
                    Column(Modifier.weight(1f).padding(start = 14.dp)) {
                        Text("Find your friends", style = MaterialTheme.typography.titleSmall)
                        Text("See their meals and workouts here, and race to your goals.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Hairline()
            }
        }

        feed.error?.let { error ->
            item { Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = Gutter, vertical = 12.dp)) }
        }

        if (feed.loading) {
            items(2) { SkeletonCard() }
        } else if (feed.posts.isEmpty() && feed.error == null) {
            item {
                Column(Modifier.fillMaxWidth().padding(40.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Welcome to your feed", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Meals and workouts from you and your friends show up here.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
            }
        }

        items(feed.posts, key = { it.id }) { post ->
            PostCard(
                post = post,
                myUid = myUid,
                onLike = { SocialRepository.toggleLike(post) },
                onDelete = { SocialRepository.deletePost(post) },
                onComment = { navController.navigate(Routes.comments(post.id)) },
                modifier = Modifier.animateItem().padding(top = 8.dp),
            )
        }
    }

    if (raceOpen) {
        ModalBottomSheet(onDismissRequest = { raceOpen = false }, containerColor = MaterialTheme.colorScheme.surfaceContainer) {
            Column(Modifier.padding(bottom = 32.dp)) {
                RaceCard(standings, yesterday.firstOrNull()?.takeIf { yesterday.size > 1 }, myUid)
                Text(
                    "Whoever ends the day closest to their own calorie goal wins.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = Gutter, vertical = 12.dp),
                )
            }
        }
    }
}

/**
 * A story circle. The ring fills with how close the person is to today's calorie goal and
 * turns grey once you've watched all their posts. Yours has a + to log a meal.
 */
@Composable
private fun StoryBubble(person: StoryPerson, isMe: Boolean, allSeen: Boolean, onClick: () -> Unit, onAdd: () -> Unit) {
    val progress by animateFloatAsState(
        if (person.target > 0) (person.eaten.toFloat() / person.target).coerceIn(0f, 1f) else 0f,
        tween(900, easing = FastOutSlowInEasing), label = "story ring",
    )
    val track = MaterialTheme.colorScheme.surfaceContainerHigh
    val seenColor = MaterialTheme.colorScheme.outline
    val fresh = if (person.target in 1 until person.eaten) Apricot else MaterialTheme.colorScheme.primary
    Column(
        Modifier.width(76.dp).pressable(onClick = onClick)
            .semantics { contentDescription = "${person.name}, ${person.eaten} of ${person.target} kilocalories today" },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(Modifier.size(72.dp), contentAlignment = Alignment.Center) {
            Canvas(Modifier.matchParentSize()) {
                val stroke = 3.dp.toPx()
                val inset = stroke / 2
                val s = Size(size.width - stroke, size.height - stroke)
                drawArc(track, 0f, 360f, false, Offset(inset, inset), s, style = Stroke(stroke))
                when {
                    person.posts.isEmpty() -> Unit
                    allSeen -> drawArc(seenColor, 0f, 360f, false, Offset(inset, inset), s, style = Stroke(stroke))
                    else -> drawArc(fresh, -90f, 360f * progress.coerceAtLeast(0.04f), false, Offset(inset, inset), s, style = Stroke(stroke, cap = StrokeCap.Round))
                }
            }
            Avatar(person.avatarName, person.uid, size = 60)
            if (isMe) {
                Box(
                    Modifier.align(Alignment.BottomEnd).size(24.dp)
                        .background(MaterialTheme.colorScheme.background, CircleShape).padding(2.dp)
                        .background(MaterialTheme.colorScheme.primary, CircleShape)
                        .pressable(onClick = onAdd),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Filled.Add, "Log a meal", tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(16.dp)) }
            }
        }
        Text(
            if (isMe) person.name else person.name.substringBefore(' '),
            style = MaterialTheme.typography.labelMedium,
            maxLines = 1, overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}
