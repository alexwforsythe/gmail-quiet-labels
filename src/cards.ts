import actions from './actions';
import { Gmail } from './gmail';
import { defaultEvaluationIntervalHours, loadProps } from './properties';

const aboutLink = 'https://www.alexwforsythe.com/gmail-quiet-labels/';
const evaluationIntervalsHours = [1, 6, defaultEvaluationIntervalHours, 24];

export function buildHomepage(userLocale: string | undefined) {
  const { settings, state } = loadProps();

  // Label selection
  const labelSelect = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setTitle('Match threads with label')
    .setFieldName('labelId')
    .setOnChangeAction(
      CardService.newAction().setFunctionName(actions.handleChangeLabelId.name),
    );
  const userLabels = Gmail.getUserLabels().sort((a, b) =>
    a.getName().localeCompare(b.getName(), userLocale),
  );
  userLabels.forEach((l) => {
    labelSelect.addItem(l.getName(), l.getId(), l.getId() === settings.labelId);
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

  return (
    CardService.newCardBuilder()
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
          .setOpenLink(CardService.newOpenLink().setUrl(aboutLink)),
      )
      // .addCardAction(
      //   CardService.newCardAction()
      //     .setText('Clear state')
      //     .setOnClickAction(
      //       CardService.newAction().setFunctionName(handleClickClearState.name),
      //     ),
      // )
      .addSection(
        CardService.newCardSection()
          .setHeader('Filter')
          .addWidget(labelSelect)
          .addWidget(
            CardService.newDecoratedText()
              .setText('Exclude read messages')
              .setSwitchControl(
                CardService.newSwitch()
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
                .addRequiredWidget('labelId'),
            ),
        ),
      )
      .build()
  );
}
