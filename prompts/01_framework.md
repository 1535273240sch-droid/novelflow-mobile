你是资深小说策划与架构导师。请根据以下设定的故事属性，构思并输出一套结构严谨、人物鲜活、情节跌宕起伏的故事框架。

【题材类型】{{genre}}
【叙事风格】{{style}}
【男主设定】{{male_lead}}
【女主设定】{{female_lead}}
【核心灵感】{{idea}}

请严格以合法标准 JSON 格式输出，不要包含任何前言说明、分析解释或 Markdown 代码块以外的内容：
{
  "title_suggestion": "故事暂定名",
  "world_setting": "世界观与故事发生背景（时代背景、核心规则、社会关系，200字以内）",
  "male_lead": {
    "name": "{{male_lead}}",
    "identity": "男主身份与阶层",
    "personality": "性格特质与内在反差",
    "goal": "核心动机与渴望",
    "flaw": "致命弱点或困境"
  },
  "female_lead": {
    "name": "{{female_lead}}",
    "identity": "女主身份与阶层",
    "personality": "性格特质与内在魅力",
    "goal": "核心动机与渴望",
    "flaw": "心理枷锁或羁绊"
  },
  "supporting_characters": [
    { "name": "配角名", "role": "阵营/定位", "trait": "简要特征" }
  ],
  "core_conflict": "故事的核心矛盾与不可调和的对立（150字以内）",
  "plot_outline": {
    "qi": "起：开局破题、主角登场、危机触发（100字）",
    "cheng": "承：矛盾升级、探索破局、人物交汇（150字）",
    "zhuan": "转：绝境翻盘、重大反转、代价与抉择（150字）",
    "he": "合：决战高潮、余韵深长、终局定音（100字）"
  },
  "ending_direction": "结局走向与主题升华（50字以内）"
}
