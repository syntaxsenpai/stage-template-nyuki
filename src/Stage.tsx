import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";

/***
 * Expression type for Nyuki's facial expressions
 ***/
type Expression = 
    | 'admiration' | 'amusement' | 'anger' | 'annoyance' | 'approval' 
    | 'caring' | 'confusion' | 'curiosity' | 'desire' | 'disappointment' 
    | 'disapproval' | 'disgust' | 'embarrassment' | 'excitement' | 'fear' 
    | 'gratitude' | 'grief' | 'joy' | 'love' | 'nervousness' 
    | 'optimism' | 'pride' | 'realization' | 'relief' | 'remorse' 
    | 'sadness' | 'surprise' | 'neutral'
    | 'special_ahegao' | 'special_arrogant' | 'special_flirty' 
    | 'special_sexy' | 'special_tsundere' | 'special_yandere';

/***
 * Message state type - stores the current expression
 ***/
type MessageStateType = {
    currentExpression: Expression;
};

/***
 * Configuration type for the stage
 ***/
type ConfigType = {
    defaultExpression?: Expression;
    imageSize?: 'small' | 'medium' | 'large' | 'full';
};

type InitStateType = null;
type ChatStateType = null;

/***
 * Emotion keywords mapped to expressions
 * These patterns are used to detect emotions from the bot's response
 ***/
const EMOTION_PATTERNS: { expression: Expression; patterns: RegExp[] }[] = [
    // Special expressions (check first - more specific)
    { expression: 'special_tsundere', patterns: [/\btsundere\b/i, /\bb-baka\b/i, /\bit's not like\b/i, /\bhmph\b/i] },
    { expression: 'special_yandere', patterns: [/\byandere\b/i, /\bonly mine\b/i, /\bkill.*for you\b/i] },
    { expression: 'special_flirty', patterns: [/\bflirt/i, /\bseductive/i, /\bwink/i, /\bteasing/i] },
    { expression: 'special_arrogant', patterns: [/\barrogant/i, /\bsuperior/i, /\bbeneath me\b/i] },
    { expression: 'special_sexy', patterns: [/\bsexy\b/i, /\bsensual/i, /\blust/i] },
    { expression: 'special_ahegao', patterns: [/\bahegao\b/i, /\becstasy\b/i] },
    
    // Standard expressions
    { expression: 'joy', patterns: [/\*laughs?\*/i, /\*giggles?\*/i, /\*chuckles?\*/i, /\*smiles? (bright|wide|warm)/i, /\bhaha\b/i, /\bhehe\b/i, /\*beams?\*/i] },
    { expression: 'amusement', patterns: [/\*smirks?\*/i, /\*grins?\*/i, /\bamused\b/i, /\*snickers?\*/i, /\bfunny\b/i] },
    { expression: 'anger', patterns: [/\*glares?\*/i, /\*scowls?\*/i, /\*snarls?\*/i, /\bangry\b/i, /\bfurious\b/i, /\brage\b/i, /\*seethes?\*/i] },
    { expression: 'annoyance', patterns: [/\*sighs?\*/i, /\*rolls? (her |their )?eyes?\*/i, /\bannoyed\b/i, /\*huffs?\*/i, /\birritat/i, /\*clicks? (her |their )?tongue\*/i, /\*tch\*/i] },
    { expression: 'sadness', patterns: [/\*cries?\*/i, /\*sobs?\*/i, /\*tears?\*/i, /\bsad\b/i, /\*weeps?\*/i, /\*sniffles?\*/i] },
    { expression: 'grief', patterns: [/\bgrief\b/i, /\bmourning\b/i, /\bdevastated\b/i, /\bheartbroken\b/i] },
    { expression: 'fear', patterns: [/\*trembles?\*/i, /\*shakes?\*/i, /\bscared\b/i, /\bafraid\b/i, /\*shivers?\*/i, /\bterrified\b/i] },
    { expression: 'surprise', patterns: [/\*gasps?\*/i, /\bsurprised?\b/i, /\*eyes? widen/i, /\bshocked\b/i, /\*blinks?\*/i] },
    { expression: 'confusion', patterns: [/\*tilts? (her |their )?head\*/i, /\bconfused\b/i, /\*furrows? (her |their )?brow/i, /\bpuzzled\b/i, /\*scratches? (her |their )?head\*/i] },
    { expression: 'embarrassment', patterns: [/\*blushes?\*/i, /\*flushes?\*/i, /\bembarrassed\b/i, /\*face (turns?|goes?) red\*/i, /\bflustered\b/i] },
    { expression: 'nervousness', patterns: [/\bnervous\b/i, /\*fidgets?\*/i, /\banxious\b/i, /\*shifts? (her |their )?weight\*/i, /\*bites? (her |their )?lip\*/i] },
    { expression: 'love', patterns: [/\blove\b/i, /\*gazes? (loving|tender|soft)/i, /\badore\b/i, /\baffection/i] },
    { expression: 'desire', patterns: [/\bdesire\b/i, /\bwant you\b/i, /\bneed you\b/i, /\byearning\b/i, /\blonging\b/i] },
    { expression: 'admiration', patterns: [/\badmir/i, /\bimpressed\b/i, /\*looks? (at .* )?with respect\*/i, /\brespect\b/i] },
    { expression: 'approval', patterns: [/\*nods?\*/i, /\bapprove\b/i, /\bagree\b/i, /\*thumbs? up\*/i, /\bnot bad\b/i] },
    { expression: 'disapproval', patterns: [/\*shakes? (her |their )?head\*/i, /\bdisapprove\b/i, /\*frowns?\*/i, /\bdisagree\b/i] },
    { expression: 'disappointment', patterns: [/\bdisappoint/i, /\*looks? down\*/i, /\blet down\b/i, /\*deflates?\*/i] },
    { expression: 'disgust', patterns: [/\bdisgust/i, /\*wrinkles? (her |their )?nose\*/i, /\brevolt/i, /\bgross\b/i, /\*gags?\*/i] },
    { expression: 'caring', patterns: [/\bcar(e|ing)\b/i, /\*touches? .* gently\*/i, /\bconcerned?\b/i, /\bworried? about\b/i] },
    { expression: 'curiosity', patterns: [/\bcurious\b/i, /\*leans? (in|forward|closer)\*/i, /\binterested\b/i, /\bintrigued\b/i] },
    { expression: 'excitement', patterns: [/\bexcited\b/i, /\*bounces?\*/i, /\beager\b/i, /\bthrilled\b/i, /\*perks? up\*/i] },
    { expression: 'gratitude', patterns: [/\bthank/i, /\bgrateful\b/i, /\bappreciate\b/i] },
    { expression: 'optimism', patterns: [/\boptimist/i, /\bhopeful\b/i, /\bpositive\b/i, /\bbright side\b/i] },
    { expression: 'pride', patterns: [/\bproud\b/i, /\bpride\b/i, /\*puffs? (out )?(her |their )?chest\*/i, /\*stands? tall\*/i] },
    { expression: 'realization', patterns: [/\brealize\b/i, /\*eyes? light up\*/i, /\bof course\b/i, /\*snaps? (her |their )?fingers?\*/i, /\baha\b/i] },
    { expression: 'relief', patterns: [/\brelief\b/i, /\brelieved\b/i, /\*exhales?\*/i, /\bphew\b/i, /\*relaxes?\*/i] },
    { expression: 'remorse', patterns: [/\bsorry\b/i, /\bremorse\b/i, /\bregret\b/i, /\bapologize\b/i, /\bguilty\b/i] },
];

/***
 * Nyuki Expression Stage
 * Displays facial expressions for the character Nyuki based on detected emotions
 ***/
export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

    currentExpression: Expression;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        super(data);
        const { messageState, config } = data;
        
        // Initialize with saved expression or default to neutral
        this.currentExpression = messageState?.currentExpression 
            ?? config?.defaultExpression 
            ?? 'neutral';
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
        return {
            success: true,
            error: null,
            initState: null,
            chatState: null,
        };
    }

    async setState(state: MessageStateType): Promise<void> {
        if (state?.currentExpression) {
            this.currentExpression = state.currentExpression;
        }
    }

    /***
     * Detects the emotion from message content using pattern matching
     ***/
    detectEmotion(content: string): Expression {
        // Check for explicit emotion tags first [emotion]
        const tagMatch = content.match(/\[(\w+)\]/);
        if (tagMatch) {
            const tag = tagMatch[1].toLowerCase();
            // Check if it's a valid expression
            const allExpressions: Expression[] = [
                'admiration', 'amusement', 'anger', 'annoyance', 'approval',
                'caring', 'confusion', 'curiosity', 'desire', 'disappointment',
                'disapproval', 'disgust', 'embarrassment', 'excitement', 'fear',
                'gratitude', 'grief', 'joy', 'love', 'nervousness',
                'optimism', 'pride', 'realization', 'relief', 'remorse',
                'sadness', 'surprise', 'neutral',
                'special_ahegao', 'special_arrogant', 'special_flirty',
                'special_sexy', 'special_tsundere', 'special_yandere'
            ];
            if (allExpressions.includes(tag as Expression)) {
                return tag as Expression;
            }
            // Also check for special without prefix
            if (allExpressions.includes(('special_' + tag) as Expression)) {
                return ('special_' + tag) as Expression;
            }
        }
        
        // Check patterns for emotion detection
        for (const { expression, patterns } of EMOTION_PATTERNS) {
            for (const pattern of patterns) {
                if (pattern.test(content)) {
                    return expression;
                }
            }
        }
        
        // Default to neutral if no emotion detected
        return 'neutral';
    }

    async beforePrompt(_userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        return {
            stageDirections: null,
            messageState: { currentExpression: this.currentExpression },
            modifiedMessage: null,
            systemMessage: null,
            error: null,
            chatState: null,
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        const { content } = botMessage;
        
        // Detect emotion from the bot's response
        this.currentExpression = this.detectEmotion(content);
        
        return {
            stageDirections: null,
            messageState: { currentExpression: this.currentExpression },
            modifiedMessage: null,
            error: null,
            systemMessage: null,
            chatState: null
        };
    }

    render(): ReactElement {
        const expressionImage = `/expressions/${this.currentExpression}.png`;
        
        return (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <img 
                        src={expressionImage}
                        alt={`Nyuki - ${this.currentExpression}`}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            borderRadius: '8px',
                        }}
                    />
                </div>
                <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontFamily: 'sans-serif',
                    textTransform: 'capitalize',
                }}>
                    {this.currentExpression.replace('special_', '').replace('_', ' ')}
                </div>
            </div>
        );
    }

}
