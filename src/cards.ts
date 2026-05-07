import actions from './actions';
import { Gmail } from './gmail';
import { defaultEvaluationIntervalHours, loadProps } from './properties';

const evaluationIntervalsHours = [1, 6, defaultEvaluationIntervalHours, 24];
const helpLink = 'https://www.alexwforsythe.com/gmail-quiet-labels/';

type CardConstructor = (
  userLocale?: string,
) => GoogleAppsScript.Card_Service.Card;

function newCardBuilder() {
  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle('Settings')
        .setImageUrl(
          'https://www.gstatic.com/images/icons/material/system/1x/settings_black_48dp.png',
        ),
    )
    .addCardAction(
      CardService.newCardAction()
        .setText('About')
        .setOpenLink(CardService.newOpenLink().setUrl(helpLink)),
    );
  // .addCardAction(
  //   CardService.newCardAction()
  //     .setText('Clear state')
  //     .setOnClickAction(
  //       CardService.newAction().setFunctionName(
  //         actions.handleClickClearState.name,
  //       ),
  //     ),
  // );
}

function buildHomepage(userLocale?: string) {
  const { settings, state } = loadProps();

  // Label selection
  const labelSelect = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.MULTI_SELECT)
    .setTitle('Match threads with any of these labels')
    .setFieldName('labelIds')
    .setOnChangeAction(
      CardService.newAction().setFunctionName(
        actions.handleChangeLabelIds.name,
      ),
    );
  const userLabels = Gmail.getUserLabels().sort((a, b) =>
    a.getName().localeCompare(b.getName(), userLocale),
  );
  const labelIdsSet = new Set(settings.labelIds);
  userLabels.forEach((l) => {
    labelSelect.addItem(l.getName(), l.getId(), labelIdsSet.has(l.getId()));
  });

  // Interval selection
  const intervalSelect = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setTitle('Archive matching threads every')
    .setFieldName('intervalHours')
    .setOnChangeAction(
      CardService.newAction().setFunctionName(
        actions.handleChangeIntervalHours.name,
      ),
    );
  evaluationIntervalsHours.forEach((h) => {
    intervalSelect.addItem(
      `${h} hour${h > 1 ? 's' : ''}`,
      h.toString(),
      h === settings.intervalHours,
    );
  });

  return newCardBuilder()
    .addSection(
      CardService.newCardSection()
        .setHeader('Filter')
        .addWidget(labelSelect)
        .addWidget(
          CardService.newDecoratedText()
            .setText('Exclude read messages')
            .setSwitchControl(
              CardService.newSwitch()
                .setControlType(CardService.SwitchControlType.CHECK_BOX)
                .setFieldName('excludeRead')
                .setValue('true')
                .setSelected(settings.excludeRead)
                .setOnChangeAction(
                  CardService.newAction().setFunctionName(
                    actions.handleChangeExcludeRead.name,
                  ),
                ),
            ),
        )
        .addWidget(
          CardService.newDecoratedText()
            .setText('Exclude important messages')
            .setSwitchControl(
              CardService.newSwitch()
                .setControlType(CardService.SwitchControlType.CHECK_BOX)
                .setFieldName('excludeImportant')
                .setValue('true')
                .setSelected(settings.excludeImportant)
                .setOnChangeAction(
                  CardService.newAction().setFunctionName(
                    actions.handleChangeExcludeImportant.name,
                  ),
                ),
            ),
        ),
    )
    .addSection(
      CardService.newCardSection()
        .setHeader('Schedule')
        .addWidget(
          CardService.newDecoratedText()
            .setText('Enabled')
            .setSwitchControl(
              CardService.newSwitch()
                .setFieldName('enableTimerTrigger')
                .setValue('true')
                .setSelected(settings.enableTimerTrigger)
                .setOnChangeAction(
                  CardService.newAction().setFunctionName(
                    actions.handleChangeEnableTimerTrigger.name,
                  ),
                ),
            ),
        )
        .addWidget(intervalSelect),
    )
    .addSection(
      CardService.newCardSection()
        .setHeader('Threads archived')
        .addWidget(
          CardService.newDecoratedText()
            .setTopLabel(
              'Last run - ' +
                (state.lastRunMs
                  ? new Date(state.lastRunMs).toLocaleString(userLocale, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                    })
                  : 'Never'),
            )
            .setText(
              state.lastRunMs ? state.lastRunArchivedCount.toString() : '–',
            ),
        )
        .addWidget(
          CardService.newDecoratedText()
            .setTopLabel('All time')
            .setText(state.totalArchivedCount.toString()),
        ),
    )
    .setFixedFooter(
      CardService.newFixedFooter().setPrimaryButton(
        CardService.newTextButton()
          .setText('Run now')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName(actions.handleClickRunNow.name)
              .addRequiredWidget('labelIds'),
          ),
      ),
    )
    .build();
}

function buildErrorCard(err: unknown) {
  return newCardBuilder()
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newDecoratedText()
            .setStartIcon(
              CardService.newIconImage().setMaterialIcon(
                CardService.newMaterialIcon().setName('error'),
              ),
            )
            .setText(
              'Unable to open add-on settings. Please refresh or try again later.',
            )
            .setWrapText(true),
        )
        .addWidget(
          CardService.newDecoratedText()
            .setTopLabel('Reason')
            .setText(err instanceof Error ? err.message : 'Failed to load.'),
        ),
    )
    .setFixedFooter(
      CardService.newFixedFooter().setPrimaryButton(
        CardService.newTextButton()
          .setText('Refresh')
          .setOnClickAction(
            CardService.newAction().setFunctionName(
              actions.handleClickRefresh.name,
            ),
          ),
      ),
    )
    .build();
}

function withErrorHandling(buildCard: CardConstructor): CardConstructor {
  return (userLocale?: string) => {
    try {
      return buildCard(userLocale);
    } catch (err) {
      return buildErrorCard(err);
    }
  };
}

export default {
  buildHomepage: withErrorHandling(buildHomepage),
};
