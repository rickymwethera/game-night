/**
 * Every Dare or Challenge card. The wheel lands on a category, then a card is
 * drawn from that category's deck. Cards marked `adult` only appear when
 * adults-only (18+) content is switched on in Profile > Settings; everything
 * else is fine for a family gathering.
 *
 * Write each card as one instruction to the player whose turn it is. Keep it
 * short enough to read out loud, and doable in a living room in under a
 * minute without anything the host would have to buy.
 */

export type CategoryId = 'dare' | 'challenge' | 'impression' | 'perform' | 'group';

export interface CardText {
  text: string;
  adult?: boolean;
}

export interface Category {
  id: CategoryId;
  title: string;
  emoji: string;
  /** Wheel segment colour. Text on it is always dark. */
  color: string;
  description: string;
  /** Shown above a card from this category. */
  lead: string;
  cards: CardText[];
}

const dare: Category = {
  id: 'dare',
  title: 'Dare',
  emoji: '🔥',
  color: '#FF8A5B',
  description: 'Bold, silly, a little embarrassing.',
  lead: 'Your dare',
  cards: [
    { text: 'Speak only in Sheng until your next turn.' },
    { text: 'Talk like a radio presenter until your next turn.' },
    { text: 'Wear your shirt inside out until the next round.' },
    { text: 'Let the group give you a nickname. Everyone must use it for the rest of the game.' },
    { text: 'Call a friend and sing them Happy Birthday, even if it is not their birthday.' },
    { text: 'Send "Niaje, umekula?" to the third person in your WhatsApp chats and show the reply.' },
    { text: 'Do your best catwalk across the room while the group cheers.' },
    { text: 'Let the player on your left style your hair however they want.' },
    { text: 'Hold a conversation with the nearest wall for 20 seconds. Get emotional.' },
    { text: 'Speak in a whisper until your next turn.' },
    { text: 'End every sentence with "bana" until your next turn.' },
    { text: 'Let the group pick a new ringtone or wallpaper for your phone for the night.' },
    { text: 'Give a dramatic acceptance speech for winning Best Guest of the Evening.' },
    { text: 'Do 10 push-ups. The group counts out loud in Swahili.' },
    { text: 'Let the group choose your WhatsApp status for one hour.' },
    { text: 'Show the group the last photo you took.' },
    { text: 'Compliment every player, one by one, like a proud Kenyan auntie.' },
    { text: 'Swap seats with the player across from you and copy their posture until your next turn.' },
    { text: 'Act like a cat until your next turn. Meows only.' },
    { text: 'Try to lick your elbow. Commit fully for ten seconds.' },
    { text: 'Read the last message you sent out loud, in a newscaster voice.' },
    { text: 'Let the player on your right send one emoji, of their choice, to anyone in your recent chats.' },
    { text: 'Announce your next move like a football commentator before you do anything until your next turn.' },
    { text: 'Wear a sock on one hand until the next round.' },
    { text: 'Read your last five Google or YouTube searches out loud.', adult: true },
    { text: 'Show the group the last photo in your gallery you would not send to your mum.', adult: true },
    { text: 'Text your crush "Nimekumiss" and show the group any reply.', adult: true },
    { text: 'Tell the group about your worst date ever. Details count.', adult: true },
    { text: 'Do your most seductive walk across the room, all the way back.', adult: true },
    { text: 'Let the group read your last three DMs out loud.', adult: true },
    { text: 'Call someone you used to date and ask how their day was. Speakerphone.', adult: true },
    { text: 'Give the player on your left your best pickup line, in Sheng.', adult: true },
    { text: 'Reveal who in your contacts you would never want this group to see your chats with.', adult: true },
    { text: 'Let the group write and post an Instagram story from your phone.', adult: true },
  ],
};

const challenge: Category = {
  id: 'challenge',
  title: 'Challenge',
  emoji: '⚡',
  color: '#FFD166',
  description: 'Quick tests of skill, memory and nerve.',
  lead: 'Your challenge',
  cards: [
    { text: 'Name five Kenyan counties in ten seconds.' },
    { text: 'Say the alphabet backwards. One mistake and you start again, once.' },
    { text: 'Count from one to twenty in Swahili, fast.' },
    { text: 'Keep a straight face for 20 seconds while the group tries to make you laugh.' },
    { text: 'Balance a book or a cushion on your head and walk across the room and back.' },
    { text: 'Hold a plank for 30 seconds. The group counts.' },
    { text: 'Stand on one leg with your eyes closed for 15 seconds.' },
    { text: 'Say "Kuku kapanda kapu, kapu kapanda kuku" three times fast.' },
    { text: 'Name five Sauti Sol songs before the group counts to ten.' },
    { text: 'Name the capital of five African countries in fifteen seconds.' },
    { text: 'Spell "Mississippi" backwards, out loud.' },
    { text: 'Say a sentence of ten words where every word starts with M.' },
    { text: 'Hum a song. If anyone guesses it in 15 seconds, you pass.' },
    { text: 'Name three Harambee Stars players, past or present, in ten seconds.' },
    { text: 'Touch your toes and say every player\'s name before you stand up.' },
    { text: 'Do ten squats while reciting the days of the week in Swahili.' },
    { text: 'Hop on one foot for 20 seconds while naming fruits.' },
    { text: 'List the stops on a matatu route you know, in order.' },
    { text: 'Talk for 30 seconds about ugali without saying "um" or "like".' },
    { text: 'Guess the time without looking. Within ten minutes counts as a win.' },
    { text: 'Clap a rhythm. The player on your left must copy it exactly, or you both try again.' },
    { text: 'Name eight Kenyan foods in fifteen seconds.' },
    { text: 'Say "Red lorry, yellow lorry" five times fast.' },
    { text: 'Name three things in the room that start with the letter K in five seconds.' },
    { text: 'Hold eye contact with the player on your right for 30 seconds. First to laugh loses.', adult: true },
    { text: 'Describe your ideal date in 20 seconds using only Sheng.', adult: true },
    { text: 'Guess the age of everyone here. Anyone you get within two years of has to compliment you.', adult: true },
    { text: 'Name the last three people you texted after 11pm. No skipping.', adult: true },
    { text: 'Rate every player\'s outfit out of ten, out loud, with reasons.', adult: true },
    { text: 'Keep a straight face while the player on your left whispers anything they like in your ear.', adult: true },
  ],
};

const impression: Category = {
  id: 'impression',
  title: 'Impression',
  emoji: '🎭',
  color: '#D0BCFF',
  description: 'Become someone else for 20 seconds.',
  lead: 'Do an impression of',
  cards: [
    { text: 'A matatu tout calling passengers for town.' },
    { text: 'A news anchor reading breaking news about tonight\'s snacks.' },
    { text: 'Your mum when you come home after midnight.' },
    { text: 'Eliud Kipchoge crossing the finish line, in slow motion.' },
    { text: 'A boda boda rider negotiating the fare.' },
    { text: 'A pastor collecting the offering on a slow Sunday.' },
    { text: 'A football commentator at a Gor Mahia vs AFC Leopards derby.' },
    { text: 'A teacher catching the class making noise.' },
    { text: 'A safari guide spotting a lion. The lion is the player on your left.' },
    { text: 'A weather presenter forecasting rain in Nairobi.' },
    { text: 'A mama mboga convincing you to buy more sukuma.' },
    { text: 'A politician at a rally promising free WiFi for every home.' },
    { text: 'A shopkeeper who has run out of change.' },
    { text: 'A Kenyan dad watching the news and arguing with the TV.' },
    { text: 'A comedian on Churchill Show who forgot the punchline.' },
    { text: 'A wedding MC trying to get the shy guests on the dance floor.' },
    { text: 'A tour guide showing tourists around Nairobi CBD.' },
    { text: 'A baby tasting a lemon for the first time.' },
    { text: 'A robot learning to dance.' },
    { text: 'A chicken that just found out it\'s Christmas.' },
    { text: 'Any player in this room. The group has to guess who.' },
    { text: 'A grandmother on her first video call.' },
    { text: 'A fitness instructor who is very, very tired.' },
    { text: 'A cat that has knocked a cup off the table and does not regret it.' },
    { text: 'A drunk uncle giving a speech at a wedding.', adult: true },
    { text: 'Someone ordering at the bar in a busy Westlands club.', adult: true },
    { text: 'A club bouncer deciding who gets in tonight.', adult: true },
    { text: 'Someone trying to sneak home at 5am without waking the house.', adult: true },
    { text: 'Your ex, the day after the breakup.', adult: true },
    { text: 'A sponsor showing off his car keys at the mall.', adult: true },
  ],
};

const perform: Category = {
  id: 'perform',
  title: 'Perform',
  emoji: '🎤',
  color: '#FFB0CD',
  description: 'Sing it, dance it, own the room.',
  lead: 'Perform',
  cards: [
    { text: 'Sing the chorus of a Sauti Sol song. The group can join in.' },
    { text: 'Sing "Jambo Bwana" with full actions.' },
    { text: 'Do the Lipala dance for 15 seconds.' },
    { text: 'Rap your own name and age like a Gengetone artist.' },
    { text: 'Sing "Malaika" like an opera singer.' },
    { text: 'Beatbox for 15 seconds.' },
    { text: 'Dance like nobody\'s watching for 20 seconds. Everybody is watching.' },
    { text: 'Do your best Odi dance moves for 15 seconds.' },
    { text: 'Sing a nursery rhyme like it\'s the saddest song in the world.' },
    { text: 'Make up a jingle for the snack nearest to you.' },
    { text: 'Perform a 15-second cooking show making chapati. No ingredients.' },
    { text: 'Sing everything you say until your next turn.' },
    { text: 'Do a slow-motion action movie fight with an invisible enemy.' },
    { text: 'Do a runway walk to music the group hums.' },
    { text: 'Sing a gospel song like a rock star.' },
    { text: 'Do the robot for 15 seconds, then malfunction.' },
    { text: 'Do a 20-second stand-up bit about matatus.' },
    { text: 'Recite a poem about the person on your right. Make it rhyme.' },
    { text: 'Sing Happy Birthday in the style of a Lingala song.' },
    { text: 'Show the group the dance move you do when your song comes on.' },
    { text: 'Air-guitar solo. Ten seconds. Knees on the floor at the end.' },
    { text: 'Perform the theme tune of a TV show from your childhood.' },
    { text: 'Do a dramatic soap opera reveal: you are the long lost twin of the player on your left.' },
    { text: 'Lead the group in a short Kenyan song everyone knows.' },
    { text: 'Twerk for ten seconds. The group keeps the beat.', adult: true },
    { text: 'Serenade the player on your left with a love song, eye contact the whole time.', adult: true },
    { text: 'Do your best music video dance to a slow jam the group hums.', adult: true },
    { text: 'Act out a romantic movie scene in slow motion with a player of your choice.', adult: true },
    { text: 'Sing a love song in Swahili to the player who arrived last.', adult: true },
    { text: 'Perform a 15-second club entrance like you own the place.', adult: true },
  ],
};

const group: Category = {
  id: 'group',
  title: 'Group',
  emoji: '👥',
  color: '#7CE0A3',
  description: 'Everyone joins in. You lead.',
  lead: 'Group task',
  cards: [
    { text: 'Lead the group in a ten-second Mexican wave.' },
    { text: 'Everyone freezes like a statue. You choose the funniest pose.' },
    { text: 'Start a story with one word. It goes round the circle, one word each, until it ends.' },
    { text: 'Turn the group into a matatu: you drive, everyone else is a passenger on the way to town.' },
    { text: 'Run a two-minute chama meeting about tonight\'s snacks. Everyone must speak.' },
    { text: 'Set up a group photo pose: a wedding committee meeting.' },
    { text: 'Everyone says their best Sheng word. You pick the winner.' },
    { text: 'Count to ten as a group, one person at a time, no order. If two speak at once, start again.' },
    { text: 'Everyone does their best impression of you. You pick the best one.' },
    { text: 'Lead the group in a short workout: five jumping jacks, five squats, one big cheer.' },
    { text: 'Everyone points at who they think will win this game. Count the fingers.' },
    { text: 'Play a round of Simon Says. You are Simon.' },
    { text: 'Everyone shares the last song they listened to. You pick which one plays next.' },
    { text: 'Everyone names a Kenyan food in turn. Hesitate or repeat and you sit out. Last one standing wins.' },
    { text: 'Everyone shows their best dance move, one after another. You start.' },
    { text: 'Hum a song together as a group. The player on your left guesses it.' },
    { text: 'Everyone tells one sentence of a ghost story. You start and you end it.' },
    { text: 'The group acts out a football goal celebration. You are the scorer.' },
    { text: 'Everyone gives you a compliment. You pick the best one.' },
    { text: 'Lead a rhythm round: clap, slap knees, snap. Anyone off the beat is out.' },
    { text: 'Everyone says their childhood dream job. You guess who said what first.' },
    { text: 'Run a two-minute talent show. Everyone shows one talent. You judge.' },
    { text: 'Never have I ever: three rounds. You go first.', adult: true },
    { text: 'Everyone names their celebrity crush. You go first.', adult: true },
    { text: 'On the count of three, everyone points at the biggest flirt in the room.', adult: true },
    { text: 'Everyone shares their worst pickup line. You pick the worst one.', adult: true },
    { text: 'Everyone reveals the most embarrassing app on their phone. You go first.', adult: true },
    { text: 'On three, everyone points at who is most likely to text their ex tonight.', adult: true },
  ],
};

export const CATEGORIES: Category[] = [dare, challenge, impression, perform, group];

/** What a player does when they chicken out. The group can always pick their own instead. */
export const FORFEITS: CardText[] = [
  { text: 'Do ten squats.' },
  { text: 'Sing Happy Birthday to yourself, with feeling.' },
  { text: 'Talk in a British accent until your next turn.' },
  { text: 'Speak about yourself in the third person until your next turn.' },
  { text: 'Hold a plank for 20 seconds.' },
  { text: 'Fetch everyone a glass of water or a snack.' },
  { text: 'Let the player on your left draw a small smiley on your hand.' },
  { text: 'Give every player a compliment.' },
  { text: 'Stand up every time someone says your name until the next round.' },
  { text: 'Do your best chicken dance for ten seconds.' },
  { text: 'Say "Mimi ni kuku" before everything you say until your next turn.' },
  { text: 'Let the group pick your profile photo for the night.' },
  { text: 'Hop on one foot until your next turn starts.' },
  { text: 'Tell the group an embarrassing story from primary school.' },
  { text: 'Do your best laugh, then your worst laugh.' },
  { text: 'Narrate everything you do in Swahili until your next turn.' },
  { text: 'Read your last sent text out loud.', adult: true },
  { text: 'Let the group look through your camera roll for ten seconds.', adult: true },
  { text: 'Tell the group who your first crush was.', adult: true },
  { text: 'Let the player on your right send one message from your phone. They choose to whom.', adult: true },
  { text: 'Reveal your most recent search in your browser.', adult: true },
];

export function getCategory(id: CategoryId): Category {
  const category = CATEGORIES.find((c) => c.id === id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}
