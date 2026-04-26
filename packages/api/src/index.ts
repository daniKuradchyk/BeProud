export { supabase } from './client';
export type { SupabaseClient, Session, User } from '@supabase/supabase-js';

export {
  signInWithPassword,
  signUpWithPassword,
  sendPasswordReset,
  signOut,
  getSession,
  onAuthStateChange,
  type AuthResult,
} from './auth';

export {
  fetchMyProfile,
  fetchProfileByUsername,
  setUsername,
  updateProfile,
  updateBiometrics,
  needsOnboarding,
  type Profile,
  type PublicProfile,
  type BiometricsPatch,
} from './profile';

export {
  searchProfiles,
  fetchSuggestions,
  toggleFollow,
  respondFollowRequest,
  fetchPendingCount,
  fetchPendingFollowRequests,
  fetchMyFollowers,
  fetchMyFollowing,
  type FollowStatus,
  type ProfileSearchResult,
  type FollowEdge,
  type PendingFollowRequest,
} from './follows';

export {
  getOrCreateDm,
  markThreadRead,
  countUnread,
  fetchMyThreads,
  fetchThreadMessages,
  sendMessage,
  uploadMessageMedia,
  getMessageMediaSignedUrl,
  type Thread,
  type Message,
  type ThreadOtherUser,
  type ThreadWithLastMessage,
} from './messages';

export {
  fetchMyGroups,
  fetchGroupById,
  fetchGroupByCode,
  fetchGroupMembers,
  fetchGroupLeaderboard,
  getGroupThreadId,
  createGroup,
  addMemberToGroup,
  joinGroupByCode,
  leaveGroup,
  kickMember,
  updateMemberRole,
  updateGroup,
  regenerateInviteCode,
  deleteGroup,
  uploadGroupCover,
  type GroupRole,
  type Group,
  type GroupWithCounts,
  type GroupMember,
  type GroupLeaderboardEntry,
  type GroupPreview,
} from './groups';

export { uploadAvatar } from './storage';

export {
  fetchTaskCatalog,
  fetchTaskBySlug,
  fetchCategoriesWithCounts,
  expandEquipment,
  missingEquipment,
  type TaskCatalogItem,
  type TaskCatalogFilters,
  type EvidenceLevel,
} from './tasks';

export {
  startStudySession,
  completeStudyCycle,
  finishStudySession,
  fetchStudySession,
  fetchActiveStudySession,
  fetchTodayStudyStats,
  type StudySession,
  type StudyTodayStats,
} from './study';

export {
  generateRoutine,
  fetchActiveRoutine,
  addRoutineTask,
  removeRoutineTask,
  removeRoutineTasksBySlot,
  updateRoutineTaskFrequency,
  updateRoutineTaskTimeSlot,
  reorderRoutineTasks,
  applyWizardProposal,
  ensureActiveRoutine,
  needsRoutineSetup,
  type Routine,
  type RoutineTask,
  type RoutineTaskWithCatalog,
  type ActiveRoutine,
} from './routines';

export {
  createUserTask,
  fetchMyUserTasks,
  deleteUserTask,
  type UserTask,
} from './userTasks';

export {
  fetchMyProtocol,
  upsertMyProtocol,
  disableMyProtocol,
  logBreakEarly,
  closeCompletedFasts,
  fetchFastingHistory,
  fetchFastingStats,
  type FastingProtocolRow,
  type FastingLog,
  type FastingStats,
} from './fasting';

export {
  uploadTaskPhoto,
  createTaskCompletion,
  fetchMyRecentCompletions,
  fetchCompletionsByTask,
  fetchMyMonthlyStats,
  getSignedPhotoUrl,
  fetchTodayCompletionByRoutineTask,
  getCurrentStreak,
  type AiValidationStatus,
  type TaskCompletion,
  type TaskCompletionWithCatalog,
  type CreateTaskCompletionInput,
} from './completions';

export {
  fetchFeedPage,
  fetchPostById,
  fetchPostComments,
  createComment,
  deleteComment,
  togglePostLike,
  deletePost,
  createReport,
  blockUser,
  unblockUser,
  fetchMyBlocks,
  type Post,
  type FeedItem,
  type Comment,
  type CommentTreeNode,
  type ReportTargetType,
} from './posts';

export {
  fetchAllLeagues,
  fetchMyLeaguePosition,
  fetchGlobalLeaderboard,
  fetchWeekHistory,
  fetchAllAchievements,
  fetchUserAchievements,
  subscribeUserAchievements,
  subscribeMyLeagueChange,
  type League,
  type LeaderboardEntry,
  type Achievement,
  type AchievementCategory,
  type WeekHistoryEntry,
  type MyLeaguePosition,
} from './gamification';

export {
  fetchDailyRecommendations,
  type DailyRecommendations,
  type Recommendation,
  type RecommendationType,
  type RecommendationAction,
} from './recommendations';

export {
  fetchExerciseCatalog,
  fetchExerciseBySlug,
  fetchMyGymRoutine,
  createGymRoutineFromTemplate,
  deleteRoutineExercise,
  updateRoutineExercise,
  addRoutineExercise,
  startWorkoutSession,
  fetchWorkoutSession,
  fetchSessionSets,
  logSet,
  updateSet,
  deleteSet,
  endWorkoutSession,
  estimate1RM,
  fetchWeeklyVolumePerMuscle,
  fetchExerciseHistory,
  fetchRecentSessions,
  expandGymEquipment,
  dayName,
  todayLocalDayIndex,
  type Exercise,
  type ExerciseEquipment,
  type MuscleGroup,
  type GymRoutine,
  type GymRoutineDay,
  type GymRoutineExercise,
  type GymTemplate,
  type WorkoutSession,
  type WorkoutSet,
  type WeeklyVolumeEntry,
} from './gym';

export {
  searchFoodByText,
  lookupFoodByBarcode,
  upsertOffProductAsFoodItem,
  type OffProduct,
} from './foodSearch';

export {
  fetchTargets,
  recomputeTargets,
  updateTargetsManual,
  fetchTodayMeals,
  getOrCreateMealLog,
  addFoodToMeal,
  removeMealLogItem,
  updateMealLogItemQuantity,
  searchLocalFoodItems,
  getFoodItem,
  createCustomFood,
  fetchRecentFoodsForUser,
  fetchTodayTotals,
  type FoodItem,
  type MealLog,
  type MealLogItem,
  type MealLogWithItems,
  type NutritionTarget,
  type DayTotals,
} from './nutrition';

export {
  registerPushToken,
  removePushToken,
  fetchMyNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeMyNotifications,
  fetchMyPrefs,
  updateMyPrefs,
  updateMyTimezone,
  deleteMyAccount,
  exportMyData,
  DEFAULT_PREFS,
  type NotificationType,
  type Notification,
  type NotificationPrefs,
} from './notifications';
