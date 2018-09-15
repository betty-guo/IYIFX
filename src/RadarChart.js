import React, { Component } from 'react'
import ReactEcharts from 'echarts-for-react'

class RadarChart extends Component {
  render () {
    const option = {
      color: ['#0F0E1C'],
      textStyle: {
        fontFamily: 'Open Sans'
      },
      radar: {
        name: {
          textStyle: {
            color: '#000'
          }
        },
        indicator: [
          { name: 'Comment Disengagement', max: 1 },
          { name: 'Like Disengagement', max: 1 },
          { name: 'Color', max: 1 },
          { name: 'Moderation', max: 1 },
          { name: 'General', max: 1 }
        ]
      },
      series: [{
        type: 'radar',
        areaStyle: { normal: {} },
        data: [
          {
            value: [
              this.props.commentDisengagement,
              this.props.likeDisengagement,
              this.props.colorScore,
              this.props.moderationScore,
              this.props.generalScore
            ],
            name: 'Features'
          }
        ]
      }]
    }

    return (
      <div style={{ padding: '25px' }}>
        <ReactEcharts
          option={option}
        />
      </div>
    )
  }
}

export default RadarChart
