/*:
 * @target MZ
 * @plugindesc 属性ブレイク特徴の提供
 * @author アラン・スミシー
 * 
 * @help
 * 相手の属性有効度に一定の値を加算してからダメージを計算する特徴を提供します
 * 
 * 【使い方】
 * 特徴を持つ項目（アクター、職業、ステート、武器、防具、敵キャラ）に
 * 以下のメタタグを設定することで、相手の耐性を下げてダメージを計算します。
 * 
 * <ElementBreak:[属性ID],[減少率]>
 * 例：<ElementBreak:1,0.2>
 * →属性IDが1の攻撃をする時、相手の属性有効度が+20%される。
 * 　元が50%なら70%、元が100%なら120%。
 * 
 * 【プラグインパラメータ】
 * ・無効属性にブレイクが有効か
 * 属性有効度が0の場合にこのプラグインで適用された特徴を適用するかどうかを選択します。
 * 例：<ElementBreak:1,0.2>を持つバトラーが
 * 　　属性ID：1の属性有効度が0%のバトラーを属性ID；1で攻撃した場合
 * パラメータがtrueの場合
 * 　属性有効度が20%であるものとしてダメージを計算します。
 * パラメータがflaseの場合
 * 　属性有効度が0%であるものとしてダメージを計算します。
 * 
 * 【備考】
 * 同じ属性について複数設定されている場合、加算されます
 * 
 * 例：<ElementBreak:1,0.1>と<ElementBreak:1,0.2>を持つバトラー
 * →属性IDが1の攻撃をする時、相手の属性有効度が+30%される。
 * 
 * 【更新履歴】
 * ver1.0 公開
 * 
 * @param  無効属性にブレイクが有効か
 * @type boolean
 * @default false
 * @desc
 * 対象の属性有効度が0の場合に、このプラグインで定義された特徴を適用するかどうか。
 * trueで適用する。falseで適用しない
 * デフォルト：false
 * 
 */

(() => {

    const PluginName = "Alan_ElementBreakTrait";
    const params = PluginManager.parameters(PluginName);
    const isDQM3 = params["無効属性にブレイクが有効か"] === 'true';

    // BattleManagerにプロパティを追加
    BattleManager.runningAction = null;
    BattleManager.runningTarget = null;

    // 追加プロパティのクリア処理
    BattleManager.resetRunningProperties = function () {
        this.runningAction = null;
        this.runningTarget = null;
    };
    
    const _BattleManager_startBattle = BattleManager.startBattle;
    BattleManager.startBattle = function () {
        this.resetRunningProperties();
        _BattleManager_startBattle.call(this);
    };
    
    const _BattleManager_endBattle = BattleManager.endBattle;
    BattleManager.endBattle = function (result) {
        this.resetRunningProperties();
        _BattleManager_endBattle.call(this, result);
    };
    
    const _BattleManager_startTurn = BattleManager.startTurn;
    BattleManager.startTurn = function () {
        this.resetRunningProperties();
        _BattleManager_startTurn.call(this);
    };
    
    const _BattleManager_endTurn = BattleManager.endTurn;
    BattleManager.endTurn = function () {
        this.resetRunningProperties();
        _BattleManager_endTurn.call(this);
    };

    Game_Battler.prototype.breakAllTraits = function () {
        return this.traitObjects().reduce((r, trait) => {
            r.push(...this.breakNoteData(trait));
            return r;
        }, []);
    };

    Game_Battler.prototype.breakNoteData = function (traits) {
        const re = /<(?:ElementBreak):\s*(.*)>/g;
        const data = [];
        while (true) {
            let match = re.exec(traits.note);
            if (match) {
                data.push(match[1].split(','));
            } else {
                break;
            }
        }
        return data;
    };

    const _Game_Action_prototype_evalDamageFormula = Game_Action.prototype.evalDamageFormula
    Game_Action.prototype.evalDamageFormula = function (target) {
        BattleManager.runningAction = this;
        BattleManager.runningTarget = target;
        return _Game_Action_prototype_evalDamageFormula.call(this, target);
    }

    const _Game_BattlerBase_prototype_elementRate = Game_BattlerBase.prototype.elementRate;
    Game_BattlerBase.prototype.elementRate = function (elementId) {
        const elementRate = _Game_BattlerBase_prototype_elementRate.call(this, elementId)

        // 戦闘シーンでのみ機能
        if (SceneManager._scene instanceof Scene_Battle && BattleManager.runningAction) {
            
            // 必要なオブジェクトを取得
            const battler = BattleManager.runningAction.subject();
            const breakList = battler.breakAllTraits();

            let breakRate = 0;
            for (let i = 0; i < breakList.length; i++) {
                if (breakList[i][0] == elementId) {
                    breakRate += Number(breakList[i][1]);
                }
            }
            if (elementRate == 0) {
                return isDQM3 ? breakRate : 0;
            } else {
                return elementRate + breakRate;
            }
        } else {
            return elementRate;
        }
    };
})();
