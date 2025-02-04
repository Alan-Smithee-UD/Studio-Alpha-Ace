/*:
 * @target MZ
 * @plugindesc 戦闘開始時にプラグインパラメータに設定した変数を初期化するプラグイン
 * @author 
 * @help
 * このプラグインを導入すると、プラグインパラメータで指定された変数へ、戦闘開始時に0を代入します。
 * また、敵グループ全員のメタタグの中の値を読み取って代入することもできます。
 * 
 * 【使用方法】
 * メタタグは以下のように設定してください。
 * <EnemyRate:[val]>
 * 例：<EnemyRate:20>
 * 
 * グループ内で最大または最小または平均の値が返されます。
 * 最大、最小、平均のいずれを返すかはパラメータで設定します。
 *
 *
 * @param InitializeVariables
 * @text 初期化する変数
 * @desc 戦闘開始時に特別にログ出力する敵キャラのIDを指定します。
 * @type variable[]
 * @default []
 * 
 * @param MetaValue
 * @text メタタグ代入先
 * @desc 読み取ったメタタグの値を代入する変数を指定します
 * @type variable
 * @default 1
 * 
 * @param MetaDeal
 * @text メタタグ代入先
 * @desc 敵グループ全体のメタタグの最大、最小、平均どれを取るか
 * @type select
 * @option max
 * @option min
 * @option average
 * @default max
 * 
 */

(() => {
    const pluginName = 'Alan_ResetVariablesOnBattleStart';
    const parameters = PluginManager.parameters(pluginName);
    const initializeValues = parameters["InitializeVariables"];
    const metaValue = parameters["MetaValue"];
    const metaDeal = parameters["MetaDeal"];

    const _BattleManager_startBattle = BattleManager.startBattle;
    BattleManager.startBattle = function () {
        _BattleManager_startBattle.call(this);
        initVals(initializeValues);
        const enemies = $gameTroop.members();
        const rates = enemies.map((enemy) => { return Number($dataEnemies[enemy.enemyId()].meta.EnemyRate) });
        const rate = getMeta(rates);
        $gameVariables.setValue(metaValue, rate);
    };

    function initVals(variables) {
        const variablesArray = JSON.parse(variables); // 配列に変換
        const variablesNum = variablesArray.map(Number); // 数値配列に変換
        for (let i = 0; i < variablesNum.length; i++) {
            $gameVariables.setValue(variablesNum[i], 0);
        }
    };

    function getMeta(rates) {
        switch (metaDeal) {
            case 'max':
                return Math.max(...rates);
            case 'min':
                return Math.min(...rates);
            case 'average':
                return average(rates);
            default:
                return 0;
        }
    };

    function average(arr) {
        const len = arr.length;
        const sum = arr.reduce(function (sum, element) {
            return sum + element;
        }, 0);;
        return Math.floor(sum / len);
    }
})();

